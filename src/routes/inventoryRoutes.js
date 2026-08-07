const express = require('express');
const router = express.Router();
const {
  getInventory,
  getLowStock,
  createInventoryItem,
  updateInventoryItem,
  restock,
  adjustStock,
  getTransactions,
} = require('../controllers/inventoryController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin', 'staff'));

router.get('/', getInventory);
router.get('/low-stock', getLowStock);
router.post('/', restrictTo('admin'), createInventoryItem);
router.put('/:id', restrictTo('admin'), updateInventoryItem);
router.post('/:id/restock', restock);
router.post('/:id/adjust', adjustStock);
router.get('/:id/transactions', getTransactions);

module.exports = router;
