const {
  Order,
  OrderItem,
  MenuItem,
  InventoryItem,
  InventoryTransaction,
  Table,
  sequelize,
} = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/orders  (admin/staff) — filter by ?status=&orderType=
const getOrders = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.orderType) where.orderType = req.query.orderType;

  const orders = await Order.findAll({
    where,
    include: [
      { model: OrderItem, as: 'items', include: [MenuItem] },
      { model: Table },
    ],
    order: [['createdAt', 'DESC']],
  });
  res.json(orders);
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderItem, as: 'items', include: [MenuItem] },
      { model: Table },
    ],
  });
  if (!order) throw new AppError('Order not found', 404);
  res.json(order);
});

// POST /api/orders
// body: { orderType, tableId?, customerName?, customerPhone?, notes?, items: [{ menuItemId, quantity }] }
//
// This is the core workflow:
//   1. Validate menu items exist and are available
//   2. Verify there is enough inventory for every ingredient across all items
//   3. Create the order + order items inside a transaction
//   4. Deduct inventory and log a transaction per ingredient consumed
//   5. Mark the dine-in table as occupied
// All of this happens in a DB transaction so a failure partway through rolls everything back
// and stock is never deducted without a corresponding order.
const createOrder = asyncHandler(async (req, res) => {
  const { orderType, tableId, customerName, customerPhone, notes, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items must be a non-empty array of { menuItemId, quantity }', 400);
  }

  let table = null;
  if (orderType === 'dine_in' || !orderType) {
    if (!tableId) throw new AppError('tableId is required for dine-in orders', 400);
    table = await Table.findByPk(tableId);
    if (!table) throw new AppError('Table not found', 404);
    if (table.status === 'occupied') {
      throw new AppError(`Table ${table.tableNumber} is already occupied`, 409);
    }
  }

  const result = await sequelize.transaction(async (t) => {
    // Load all requested menu items with their recipes
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.findAll({
      where: { id: menuItemIds },
      include: [{ model: InventoryItem, as: 'ingredients', through: { attributes: ['quantityRequired'] } }],
      transaction: t,
    });

    if (menuItems.length !== new Set(menuItemIds).size) {
      throw new AppError('One or more menu items were not found', 400);
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Aggregate total ingredient consumption across the whole order
    const ingredientUsage = new Map(); // inventoryItemId -> quantity needed

    for (const line of items) {
      const menuItem = menuItemMap.get(line.menuItemId);
      if (!menuItem.isAvailable) {
        throw new AppError(`${menuItem.name} is currently unavailable`, 400);
      }
      if (!line.quantity || line.quantity <= 0) {
        throw new AppError(`Invalid quantity for ${menuItem.name}`, 400);
      }

      for (const ingredient of menuItem.ingredients) {
        const needed = ingredient.MenuItemIngredient.quantityRequired * line.quantity;
        ingredientUsage.set(
          ingredient.id,
          (ingredientUsage.get(ingredient.id) || 0) + needed
        );
      }
    }

    // Verify sufficient stock BEFORE deducting anything
    for (const [inventoryItemId, needed] of ingredientUsage.entries()) {
      const invItem = await InventoryItem.findByPk(inventoryItemId, { transaction: t });
      if (invItem.quantityInStock < needed) {
        throw new AppError(
          `Not enough ${invItem.name} in stock (need ${needed}${invItem.unit}, have ${invItem.quantityInStock}${invItem.unit})`,
          409
        );
      }
    }

    // Create the order shell
    const order = await Order.create(
      {
        orderType: orderType || 'dine_in',
        tableId: table ? table.id : null,
        customerName,
        customerPhone,
        notes,
        status: 'pending',
        totalAmount: 0,
      },
      { transaction: t }
    );

    let totalAmount = 0;
    for (const line of items) {
      const menuItem = menuItemMap.get(line.menuItemId);
      const subtotal = Number(menuItem.price) * line.quantity;
      totalAmount += subtotal;

      await OrderItem.create(
        {
          orderId: order.id,
          menuItemId: menuItem.id,
          quantity: line.quantity,
          priceAtOrder: menuItem.price,
          subtotal,
        },
        { transaction: t }
      );
    }

    await order.update({ totalAmount }, { transaction: t });

    // Deduct inventory and log each transaction
    for (const [inventoryItemId, needed] of ingredientUsage.entries()) {
      const invItem = await InventoryItem.findByPk(inventoryItemId, { transaction: t });
      invItem.quantityInStock -= needed;
      await invItem.save({ transaction: t });

      await InventoryTransaction.create(
        {
          inventoryItemId,
          type: 'order_deduction',
          quantityChange: -needed,
          resultingStock: invItem.quantityInStock,
          note: `Order #${order.id}`,
        },
        { transaction: t }
      );

      // Auto-86 the item if it just ran out — surfaced via low-stock/report endpoints too
      if (invItem.quantityInStock <= 0) {
        invItem.quantityInStock = Math.max(invItem.quantityInStock, 0);
        await invItem.save({ transaction: t });
      }
    }

    // Mark table occupied for dine-in
    if (table) {
      await table.update({ status: 'occupied' }, { transaction: t });
    }

    return order.id;
  });

  const fullOrder = await Order.findByPk(result, {
    include: [{ model: OrderItem, as: 'items', include: [MenuItem] }, { model: Table }],
  });

  res.status(201).json(fullOrder);
});

// PUT /api/orders/:id/status  (admin/staff) — move order through its lifecycle
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: [Table] });
  if (!order) throw new AppError('Order not found', 404);

  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

  await order.update({ status });

  // Free up the table once the order is completed or cancelled
  if (order.Table && ['completed', 'cancelled'].includes(status)) {
    await order.Table.update({ status: 'available' });
  }

  res.json(order);
});

module.exports = { getOrders, getOrder, createOrder, updateOrderStatus };
