const { MenuItem, InventoryItem, MenuItemIngredient } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/menu  (public) — supports ?category=&available=true
const getMenu = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.category) where.category = req.query.category;
  if (req.query.available === 'true') where.isAvailable = true;

  const items = await MenuItem.findAll({
    where,
    include: [{ model: InventoryItem, as: 'ingredients', through: { attributes: ['quantityRequired'] } }],
    order: [['category', 'ASC'], ['name', 'ASC']],
  });

  res.json(items);
});

// GET /api/menu/:id  (public)
const getMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByPk(req.params.id, {
    include: [{ model: InventoryItem, as: 'ingredients', through: { attributes: ['quantityRequired'] } }],
  });
  if (!item) throw new AppError('Menu item not found', 404);
  res.json(item);
});

// POST /api/menu  (admin) — body may include ingredients: [{ inventoryItemId, quantityRequired }]
const createMenuItem = asyncHandler(async (req, res) => {
  const { name, description, category, price, isAvailable, imageUrl, ingredients } = req.body;

  if (!name || price === undefined) {
    throw new AppError('name and price are required', 400);
  }

  const item = await MenuItem.create({ name, description, category, price, isAvailable, imageUrl });

  if (Array.isArray(ingredients) && ingredients.length) {
    for (const ing of ingredients) {
      const inv = await InventoryItem.findByPk(ing.inventoryItemId);
      if (!inv) throw new AppError(`Inventory item ${ing.inventoryItemId} not found`, 400);
      await MenuItemIngredient.create({
        menuItemId: item.id,
        inventoryItemId: ing.inventoryItemId,
        quantityRequired: ing.quantityRequired,
      });
    }
  }

  const full = await MenuItem.findByPk(item.id, {
    include: [{ model: InventoryItem, as: 'ingredients', through: { attributes: ['quantityRequired'] } }],
  });

  res.status(201).json(full);
});

// PUT /api/menu/:id  (admin)
const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByPk(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);

  const { name, description, category, price, isAvailable, imageUrl } = req.body;
  await item.update({
    name: name ?? item.name,
    description: description ?? item.description,
    category: category ?? item.category,
    price: price ?? item.price,
    isAvailable: isAvailable ?? item.isAvailable,
    imageUrl: imageUrl ?? item.imageUrl,
  });

  res.json(item);
});

// PUT /api/menu/:id/recipe  (admin) — replace the full ingredient list for a menu item
const setRecipe = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByPk(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);

  const { ingredients } = req.body; // [{ inventoryItemId, quantityRequired }]
  if (!Array.isArray(ingredients)) throw new AppError('ingredients must be an array', 400);

  await MenuItemIngredient.destroy({ where: { menuItemId: item.id } });
  for (const ing of ingredients) {
    const inv = await InventoryItem.findByPk(ing.inventoryItemId);
    if (!inv) throw new AppError(`Inventory item ${ing.inventoryItemId} not found`, 400);
    await MenuItemIngredient.create({
      menuItemId: item.id,
      inventoryItemId: ing.inventoryItemId,
      quantityRequired: ing.quantityRequired,
    });
  }

  const full = await MenuItem.findByPk(item.id, {
    include: [{ model: InventoryItem, as: 'ingredients', through: { attributes: ['quantityRequired'] } }],
  });
  res.json(full);
});

// DELETE /api/menu/:id  (admin)
const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByPk(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);
  await item.destroy();
  res.status(204).send();
});

module.exports = { getMenu, getMenuItem, createMenuItem, updateMenuItem, setRecipe, deleteMenuItem };
