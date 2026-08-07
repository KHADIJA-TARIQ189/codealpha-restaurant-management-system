const express = require('express');
const router = express.Router();
const { getOrders, getOrder, createOrder, updateOrderStatus } = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', protect, restrictTo('admin', 'staff'), getOrders);
router.get('/:id', getOrder);
router.post('/', createOrder); // customers/waitstaff can place orders
router.put('/:id/status', protect, restrictTo('admin', 'staff'), updateOrderStatus);

module.exports = router;
