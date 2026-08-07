const express = require('express');
const router = express.Router();
const {
  getMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  setRecipe,
  deleteMenuItem,
} = require('../controllers/menuController');
const { protect, restrictTo } = require('../middleware/auth');

// Public: browse the menu
router.get('/', getMenu);
router.get('/:id', getMenuItem);

// Admin only: manage the menu
router.post('/', protect, restrictTo('admin'), createMenuItem);
router.put('/:id', protect, restrictTo('admin'), updateMenuItem);
router.put('/:id/recipe', protect, restrictTo('admin'), setRecipe);
router.delete('/:id', protect, restrictTo('admin'), deleteMenuItem);

module.exports = router;
