const { Reservation, Table } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

function isOverlapping(startA, durationA, startB, durationB) {
  const endA = new Date(startA.getTime() + durationA * 60000);
  const endB = new Date(startB.getTime() + durationB * 60000);
  return startA < endB && endA > startB;
}

// GET /api/reservations  (admin/staff) — optionally filter by date (?date=YYYY-MM-DD) or status
const getReservations = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.date) {
    const dayStart = new Date(`${req.query.date}T00:00:00`);
    const dayEnd = new Date(`${req.query.date}T23:59:59`);
    where.reservationTime = { [Op.between]: [dayStart, dayEnd] };
  }

  const reservations = await Reservation.findAll({
    where,
    include: [{ model: Table }],
    order: [['reservationTime', 'ASC']],
  });
  res.json(reservations);
});

// POST /api/reservations  (public) — reserve a specific table, checking for conflicts
const createReservation = asyncHandler(async (req, res) => {
  const { tableId, customerName, customerPhone, partySize, reservationTime, durationMinutes, notes } = req.body;

  if (!tableId || !customerName || !customerPhone || !partySize || !reservationTime) {
    throw new AppError('tableId, customerName, customerPhone, partySize and reservationTime are required', 400);
  }

  const table = await Table.findByPk(tableId);
  if (!table) throw new AppError('Table not found', 404);

  if (partySize > table.capacity) {
    throw new AppError(`Table ${table.tableNumber} only seats ${table.capacity} guests`, 400);
  }

  const requestedStart = new Date(reservationTime);
  if (isNaN(requestedStart.getTime())) throw new AppError('reservationTime must be a valid date', 400);
  const duration = durationMinutes || 90;

  const existing = await Reservation.findAll({
    where: { tableId, status: { [Op.in]: ['confirmed', 'seated'] } },
  });

  const conflict = existing.some((r) =>
    isOverlapping(requestedStart, duration, new Date(r.reservationTime), r.durationMinutes)
  );

  if (conflict) {
    throw new AppError('This table is already reserved for the requested time window', 409);
  }

  const reservation = await Reservation.create({
    tableId,
    customerName,
    customerPhone,
    partySize,
    reservationTime: requestedStart,
    durationMinutes: duration,
    notes,
  });

  // Reflect the upcoming reservation on the table's status
  await table.update({ status: 'reserved' });

  res.status(201).json(reservation);
});

// PUT /api/reservations/:id  (admin/staff) — update status (seated/completed/cancelled/no_show)
const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id, { include: [Table] });
  if (!reservation) throw new AppError('Reservation not found', 404);

  const { status, notes, partySize, reservationTime, durationMinutes } = req.body;
  await reservation.update({
    status: status ?? reservation.status,
    notes: notes ?? reservation.notes,
    partySize: partySize ?? reservation.partySize,
    reservationTime: reservationTime ?? reservation.reservationTime,
    durationMinutes: durationMinutes ?? reservation.durationMinutes,
  });

  // Keep the table's status roughly in sync with reservation lifecycle
  if (reservation.Table) {
    if (status === 'seated') {
      await reservation.Table.update({ status: 'occupied' });
    } else if (['completed', 'cancelled', 'no_show'].includes(status)) {
      await reservation.Table.update({ status: 'available' });
    }
  }

  res.json(reservation);
});

// DELETE /api/reservations/:id  (admin/staff)
const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id, { include: [Table] });
  if (!reservation) throw new AppError('Reservation not found', 404);

  await reservation.update({ status: 'cancelled' });
  if (reservation.Table) await reservation.Table.update({ status: 'available' });

  res.json(reservation);
});

module.exports = { getReservations, createReservation, updateReservation, cancelReservation };
