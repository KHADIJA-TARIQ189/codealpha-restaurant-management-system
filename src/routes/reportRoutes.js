const express = require('express');
const router = express.Router();
const { getDailySales, getTopItems, getStockAlerts, getSalesRange } = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin'));

router.get('/daily-sales', getDailySales);
router.get('/top-items', getTopItems);
router.get('/stock-alerts', getStockAlerts);
router.get('/sales-range', getSalesRange);

module.exports = router;
