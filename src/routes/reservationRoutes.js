const express = require('express');
const router = express.Router();
const {
  getReservations,
  createReservation,
  updateReservation,
  cancelReservation,
} = require('../controllers/reservationController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', protect, restrictTo('admin', 'staff'), getReservations);
router.post('/', createReservation); // customer-facing booking
router.put('/:id', protect, restrictTo('admin', 'staff'), updateReservation);
router.delete('/:id', cancelReservation); // allow customers to cancel their own booking

module.exports = router;
