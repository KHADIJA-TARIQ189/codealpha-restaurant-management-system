const { InventoryItem, InventoryTransaction } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// GET /api/inventory  (admin/staff)
const getInventory = asyncHandler(async (req, res) => {
  const items = await InventoryItem.findAll({ order: [['name', 'ASC']] });
  res.json(items);
});

// GET /api/inventory/low-stock  (admin/staff) — items at or below their reorder threshold
const getLowStock = asyncHandler(async (req, res) => {
  // Comparing two columns of the same row requires a raw column reference,
  // so this filters in JS rather than fighting the query builder over it.
  const all = await InventoryItem.findAll({ order: [['name', 'ASC']] });
  const lowStock = all.filter((i) => i.quantityInStock <= i.reorderThreshold);
  res.json(lowStock);
});

// POST /api/inventory  (admin) — create a new inventory item
const createInventoryItem = asyncHandler(async (req, res) => {
  const { name, unit, quantityInStock, reorderThreshold, costPerUnit } = req.body;
  if (!name) throw new AppError('name is required', 400);

  const item = await InventoryItem.create({ name, unit, quantityInStock, reorderThreshold, costPerUnit });

  if (quantityInStock && quantityInStock > 0) {
    await InventoryTransaction.create({
      inventoryItemId: item.id,
      type: 'restock',
      quantityChange: quantityInStock,
      resultingStock: item.quantityInStock,
      note: 'Initial stock',
    });
  }

  res.status(201).json(item);
});

// PUT /api/inventory/:id  (admin) — update metadata (not stock quantity directly)
const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByPk(req.params.id);
  if (!item) throw new AppError('Inventory item not found', 404);

  const { name, unit, reorderThreshold, costPerUnit } = req.body;
  await item.update({
    name: name ?? item.name,
    unit: unit ?? item.unit,
    reorderThreshold: reorderThreshold ?? item.reorderThreshold,
    costPerUnit: costPerUnit ?? item.costPerUnit,
  });

  res.json(item);
});

// POST /api/inventory/:id/restock  (admin) — add stock, logged as a transaction
const restock = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByPk(req.params.id);
  if (!item) throw new AppError('Inventory item not found', 404);

  const { quantity, note } = req.body;
  if (!quantity || quantity <= 0) throw new AppError('quantity must be a positive number', 400);

  item.quantityInStock += Number(quantity);
  await item.save();

  await InventoryTransaction.create({
    inventoryItemId: item.id,
    type: 'restock',
    quantityChange: quantity,
    resultingStock: item.quantityInStock,
    note: note || 'Manual restock',
  });

  res.json(item);
});

// POST /api/inventory/:id/adjust  (admin) — manual correction or waste logging (can be negative)
const adjustStock = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByPk(req.params.id);
  if (!item) throw new AppError('Inventory item not found', 404);

  const { quantityChange, type, note } = req.body;
  if (quantityChange === undefined) throw new AppError('quantityChange is required', 400);

  const newStock = item.quantityInStock + Number(quantityChange);
  if (newStock < 0) throw new AppError('Adjustment would result in negative stock', 400);

  item.quantityInStock = newStock;
  await item.save();

  await InventoryTransaction.create({
    inventoryItemId: item.id,
    type: type === 'waste' ? 'waste' : 'adjustment',
    quantityChange,
    resultingStock: item.quantityInStock,
    note: note || '',
  });

  res.json(item);
});

// GET /api/inventory/:id/transactions  (admin) — audit trail for one item
const getTransactions = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByPk(req.params.id);
  if (!item) throw new AppError('Inventory item not found', 404);

  const transactions = await InventoryTransaction.findAll({
    where: { inventoryItemId: item.id },
    order: [['createdAt', 'DESC']],
  });

  res.json(transactions);
});

module.exports = {
  getInventory,
  getLowStock,
  createInventoryItem,
  updateInventoryItem,
  restock,
  adjustStock,
  getTransactions,
};
