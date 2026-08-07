module.exports = (sequelize, DataTypes) => {
  // Join table: how much of each InventoryItem a given MenuItem consumes per unit sold.
  // This is what drives automatic inventory deduction when an order is placed.
  const MenuItemIngredient = sequelize.define('MenuItemIngredient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantityRequired: {
      // Amount of the inventory item's unit consumed per 1 MenuItem sold
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0.0001 },
    },
  });

  return MenuItemIngredient;
};
