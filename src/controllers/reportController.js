const { Order, OrderItem, MenuItem, InventoryItem, sequelize } = require('../models');
const { Op } = require('sequelize');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/reports/daily-sales?date=YYYY-MM-DD  (admin) — defaults to today
const getDailySales = asyncHandler(async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999`);

  if (isNaN(dayStart.getTime())) throw new AppError('Invalid date', 400);

  const orders = await Order.findAll({
    where: {
      createdAt: { [Op.between]: [dayStart, dayEnd] },
      status: { [Op.ne]: 'cancelled' },
    },
    include: [{ model: OrderItem, as: 'items' }],
  });

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalOrders = orders.length;
  const totalItemsSold = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const byType = {};
  for (const o of orders) {
    byType[o.orderType] = (byType[o.orderType] || 0) + Number(o.totalAmount);
  }

  res.json({
    date: dateStr,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalOrders,
    totalItemsSold,
    averageOrderValue: totalOrders ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
    revenueByOrderType: byType,
  });
});

// GET /api/reports/top-items?date=YYYY-MM-DD&limit=5  (admin)
const getTopItems = asyncHandler(async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const limit = Number(req.query.limit) || 5;
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999`);

  const orderItems = await OrderItem.findAll({
    include: [
      { model: MenuItem, attributes: ['id', 'name', 'category'] },
      {
        model: Order,
        attributes: [],
        where: { createdAt: { [Op.between]: [dayStart, dayEnd] }, status: { [Op.ne]: 'cancelled' } },
      },
    ],
  });

  const tally = new Map();
  for (const oi of orderItems) {
    const key = oi.MenuItem.id;
    const entry = tally.get(key) || { name: oi.MenuItem.name, category: oi.MenuItem.category, quantitySold: 0, revenue: 0 };
    entry.quantitySold += oi.quantity;
    entry.revenue += Number(oi.subtotal);
    tally.set(key, entry);
  }

  const ranked = [...tally.values()]
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit)
    .map((e) => ({ ...e, revenue: Number(e.revenue.toFixed(2)) }));

  res.json({ date: dateStr, topItems: ranked });
});

// GET /api/reports/stock-alerts  (admin) — items at/below reorder threshold
const getStockAlerts = asyncHandler(async (req, res) => {
  const items = await InventoryItem.findAll();
  const alerts = items
    .filter((i) => i.quantityInStock <= i.reorderThreshold)
    .map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      quantityInStock: i.quantityInStock,
      reorderThreshold: i.reorderThreshold,
      severity: i.quantityInStock <= 0 ? 'out_of_stock' : 'low_stock',
    }));

  res.json({ count: alerts.length, alerts });
});

// GET /api/reports/sales-range?start=YYYY-MM-DD&end=YYYY-MM-DD  (admin) — daily breakdown over a range
const getSalesRange = asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) throw new AppError('start and end query params (YYYY-MM-DD) are required', 400);

  const rangeStart = new Date(`${start}T00:00:00`);
  const rangeEnd = new Date(`${end}T23:59:59.999`);
  if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) throw new AppError('Invalid date range', 400);

  const orders = await Order.findAll({
    where: { createdAt: { [Op.between]: [rangeStart, rangeEnd] }, status: { [Op.ne]: 'cancelled' } },
  });

  const byDate = {};
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    byDate[day] = (byDate[day] || 0) + Number(o.totalAmount);
  }

  const breakdown = Object.entries(byDate)
    .map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  res.json({
    start,
    end,
    totalRevenue: Number(breakdown.reduce((s, d) => s + d.revenue, 0).toFixed(2)),
    breakdown,
  });
});

module.exports = { getDailySales, getTopItems, getStockAlerts, getSalesRange };
