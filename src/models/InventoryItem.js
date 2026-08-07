module.exports = (sequelize, DataTypes) => {
  const InventoryItem = sequelize.define('InventoryItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    unit: {
      // e.g. kg, litre, piece
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unit',
    },
    quantityInStock: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    reorderThreshold: {
      // Below this quantity, item shows up in low-stock alerts
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 5,
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  });

  return InventoryItem;
};
