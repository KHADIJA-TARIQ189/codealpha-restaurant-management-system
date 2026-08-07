const { Table, Reservation } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// GET /api/tables  (public) — optionally filter by status
const getTables = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const tables = await Table.findAll({ where, order: [['tableNumber', 'ASC']] });
  res.json(tables);
});

// GET /api/tables/available?time=ISO_DATE&partySize=4&durationMinutes=90
// Finds tables with enough capacity that have no overlapping reservation at the requested time.
const getAvailableTables = asyncHandler(async (req, res) => {
  const { time, partySize, durationMinutes } = req.query;
  if (!time) throw new AppError('time query parameter (ISO date) is required', 400);

  const requestedStart = new Date(time);
  if (isNaN(requestedStart.getTime())) throw new AppError('time must be a valid date', 400);

  const duration = Number(durationMinutes) || 90;
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);
  const minCapacity = Number(partySize) || 1;

  const candidateTables = await Table.findAll({
    where: { capacity: { [Op.gte]: minCapacity }, status: { [Op.ne]: 'occupied' } },
    order: [['capacity', 'ASC']],
  });

  // A table is unavailable if it has an active reservation whose window overlaps the requested window.
  const activeReservations = await Reservation.findAll({
    where: { status: { [Op.in]: ['confirmed', 'seated'] } },
  });

  const isOverlapping = (res1Start, res1DurationMin, requestStart, requestEnd) => {
    const res1End = new Date(res1Start.getTime() + res1DurationMin * 60000);
    return res1Start < requestEnd && res1End > requestStart;
  };

  const availableTables = candidateTables.filter((table) => {
    const conflict = activeReservations.some(
      (r) =>
        r.tableId === table.id &&
        isOverlapping(new Date(r.reservationTime), r.durationMinutes, requestedStart, requestedEnd)
    );
    return !conflict;
  });

  res.json({
    requestedWindow: { start: requestedStart, end: requestedEnd },
    availableTables,
  });
});

// POST /api/tables  (admin)
const createTable = asyncHandler(async (req, res) => {
  const { tableNumber, capacity, location } = req.body;
  if (!tableNumber) throw new AppError('tableNumber is required', 400);

  const table = await Table.create({ tableNumber, capacity, location });
  res.status(201).json(table);
});

// PUT /api/tables/:id  (admin/staff) — e.g. manually mark occupied/available
const updateTable = asyncHandler(async (req, res) => {
  const table = await Table.findByPk(req.params.id);
  if (!table) throw new AppError('Table not found', 404);

  const { capacity, location, status } = req.body;
  await table.update({
    capacity: capacity ?? table.capacity,
    location: location ?? table.location,
    status: status ?? table.status,
  });

  res.json(table);
});

// DELETE /api/tables/:id  (admin)
const deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findByPk(req.params.id);
  if (!table) throw new AppError('Table not found', 404);
  await table.destroy();
  res.status(204).send();
});

module.exports = { getTables, getAvailableTables, createTable, updateTable, deleteTable };
