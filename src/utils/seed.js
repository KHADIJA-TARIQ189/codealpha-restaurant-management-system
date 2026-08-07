require('dotenv').config();
const {
  sequelize,
  User,
  MenuItem,
  InventoryItem,
  MenuItemIngredient,
  Table,
} = require('../models');

async function seed() {
  await sequelize.sync({ force: true }); // WARNING: wipes existing data — for demo/dev only
  console.log('Database reset.');

  // --- Admin user ---
  await User.create({
    name: 'Restaurant Admin',
    email: 'admin@restaurant.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log('Admin user created: admin@restaurant.com / admin123');

  // --- Tables ---
  const tables = await Table.bulkCreate([
    { tableNumber: 1, capacity: 2, location: 'Window' },
    { tableNumber: 2, capacity: 4, location: 'Indoor' },
    { tableNumber: 3, capacity: 4, location: 'Indoor' },
    { tableNumber: 4, capacity: 6, location: 'Patio' },
    { tableNumber: 5, capacity: 2, location: 'Patio' },
  ]);
  console.log(`${tables.length} tables created.`);

  // --- Inventory ---
  const [flour, tomato, cheese, beef, lettuce, bun, potato, oil, chicken, rice] =
    await InventoryItem.bulkCreate([
      { name: 'Flour', unit: 'kg', quantityInStock: 20, reorderThreshold: 5, costPerUnit: 1.2 },
      { name: 'Tomato', unit: 'kg', quantityInStock: 15, reorderThreshold: 4, costPerUnit: 2.0 },
      { name: 'Cheese', unit: 'kg', quantityInStock: 10, reorderThreshold: 3, costPerUnit: 6.5 },
      { name: 'Beef Patty', unit: 'piece', quantityInStock: 40, reorderThreshold: 10, costPerUnit: 1.8 },
      { name: 'Lettuce', unit: 'kg', quantityInStock: 8, reorderThreshold: 2, costPerUnit: 1.5 },
      { name: 'Burger Bun', unit: 'piece', quantityInStock: 50, reorderThreshold: 10, costPerUnit: 0.4 },
      { name: 'Potato', unit: 'kg', quantityInStock: 25, reorderThreshold: 5, costPerUnit: 1.0 },
      { name: 'Cooking Oil', unit: 'litre', quantityInStock: 12, reorderThreshold: 3, costPerUnit: 3.2 },
      { name: 'Chicken Breast', unit: 'kg', quantityInStock: 3, reorderThreshold: 5, costPerUnit: 5.0 }, // intentionally low, triggers alert
      { name: 'Rice', unit: 'kg', quantityInStock: 18, reorderThreshold: 5, costPerUnit: 1.1 },
    ]);
  console.log('Inventory items created.');

  // --- Menu items ---
  const margherita = await MenuItem.create({
    name: 'Margherita Pizza',
    description: 'Classic pizza with tomato, mozzarella and basil',
    category: 'Main Course',
    price: 9.99,
  });
  const cheeseburger = await MenuItem.create({
    name: 'Cheeseburger',
    description: 'Beef patty with cheese, lettuce and a toasted bun',
    category: 'Main Course',
    price: 8.5,
  });
  const fries = await MenuItem.create({
    name: 'French Fries',
    description: 'Crispy golden fries',
    category: 'Starter',
    price: 3.5,
  });
  const grilledChicken = await MenuItem.create({
    name: 'Grilled Chicken & Rice',
    description: 'Grilled chicken breast served over seasoned rice',
    category: 'Main Course',
    price: 11.0,
  });
  console.log('Menu items created.');

  // --- Recipes (menu item -> inventory consumption) ---
  await MenuItemIngredient.bulkCreate([
    { menuItemId: margherita.id, inventoryItemId: flour.id, quantityRequired: 0.25 },
    { menuItemId: margherita.id, inventoryItemId: tomato.id, quantityRequired: 0.15 },
    { menuItemId: margherita.id, inventoryItemId: cheese.id, quantityRequired: 0.2 },

    { menuItemId: cheeseburger.id, inventoryItemId: beef.id, quantityRequired: 1 },
    { menuItemId: cheeseburger.id, inventoryItemId: bun.id, quantityRequired: 1 },
    { menuItemId: cheeseburger.id, inventoryItemId: cheese.id, quantityRequired: 0.05 },
    { menuItemId: cheeseburger.id, inventoryItemId: lettuce.id, quantityRequired: 0.03 },

    { menuItemId: fries.id, inventoryItemId: potato.id, quantityRequired: 0.3 },
    { menuItemId: fries.id, inventoryItemId: oil.id, quantityRequired: 0.05 },

    { menuItemId: grilledChicken.id, inventoryItemId: chicken.id, quantityRequired: 0.25 },
    { menuItemId: grilledChicken.id, inventoryItemId: rice.id, quantityRequired: 0.2 },
  ]);
  console.log('Recipes linked.');

  console.log('\nSeed complete. You can now log in as admin@restaurant.com / admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
