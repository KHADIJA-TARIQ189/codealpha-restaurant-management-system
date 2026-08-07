module.exports = (sequelize, DataTypes) => {
  // Audit trail for every stock change: order deductions, manual restocks, corrections.
  const InventoryTransaction = sequelize.define('InventoryTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM('restock', 'order_deduction', 'adjustment', 'waste'),
      allowNull: false,
    },
    quantityChange: {
      // Positive for additions (restock), negative for deductions
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    resultingStock: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    note: DataTypes.STRING,
  });

  return InventoryTransaction;
};
