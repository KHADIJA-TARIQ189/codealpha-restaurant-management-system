const express = require('express');
const router = express.Router();
const {
  getTables,
  getAvailableTables,
  createTable,
  updateTable,
  deleteTable,
} = require('../controllers/tableController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', getTables);
router.get('/available', getAvailableTables);
router.post('/', protect, restrictTo('admin'), createTable);
router.put('/:id', protect, restrictTo('admin', 'staff'), updateTable);
router.delete('/:id', protect, restrictTo('admin'), deleteTable);

module.exports = router;
