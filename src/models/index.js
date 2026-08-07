const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuItem = require('./MenuItem')(sequelize, DataTypes);
const InventoryItem = require('./InventoryItem')(sequelize, DataTypes);
const MenuItemIngredient = require('./MenuItemIngredient')(sequelize, DataTypes);
const Table = require('./Table')(sequelize, DataTypes);
const Reservation = require('./Reservation')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const OrderItem = require('./OrderItem')(sequelize, DataTypes);
const InventoryTransaction = require('./InventoryTransaction')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);

// ---- Menu <-> Inventory (recipe / bill of materials) ----
// foreignKey/otherKey are pinned explicitly so the belongsToMany join columns are the
// SAME columns used by the hasMany/belongsTo pair below, instead of Sequelize creating
// a second set of implicit FK columns on MenuItemIngredient.
MenuItem.belongsToMany(InventoryItem, {
  through: MenuItemIngredient,
  as: 'ingredients',
  foreignKey: 'menuItemId',
  otherKey: 'inventoryItemId',
});
InventoryItem.belongsToMany(MenuItem, {
  through: MenuItemIngredient,
  as: 'usedInMenuItems',
  foreignKey: 'inventoryItemId',
  otherKey: 'menuItemId',
});
MenuItem.hasMany(MenuItemIngredient, { foreignKey: 'menuItemId', as: 'recipeLines' });
MenuItemIngredient.belongsTo(MenuItem, { foreignKey: 'menuItemId' });
InventoryItem.hasMany(MenuItemIngredient, { foreignKey: 'inventoryItemId' });
MenuItemIngredient.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });

// ---- Table <-> Reservation ----
Table.hasMany(Reservation, { foreignKey: 'tableId', onDelete: 'SET NULL' });
Reservation.belongsTo(Table, { foreignKey: 'tableId' });

// ---- Table <-> Order ----
Table.hasMany(Order, { foreignKey: 'tableId', onDelete: 'SET NULL' });
Order.belongsTo(Table, { foreignKey: 'tableId' });

// ---- Order <-> OrderItem <-> MenuItem ----
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
MenuItem.hasMany(OrderItem, { foreignKey: 'menuItemId' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menuItemId' });

// ---- Inventory <-> InventoryTransaction ----
InventoryItem.hasMany(InventoryTransaction, { foreignKey: 'inventoryItemId', as: 'transactions' });
InventoryTransaction.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId' });

module.exports = {
  sequelize,
  MenuItem,
  InventoryItem,
  MenuItemIngredient,
  Table,
  Reservation,
  Order,
  OrderItem,
  InventoryTransaction,
  User,
};
