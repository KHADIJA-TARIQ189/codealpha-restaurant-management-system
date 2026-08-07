module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderType: {
      type: DataTypes.ENUM('dine_in', 'takeaway', 'delivery'),
      allowNull: false,
      defaultValue: 'dine_in',
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'preparing',
        'ready',
        'served',
        'completed',
        'cancelled'
      ),
      defaultValue: 'pending',
    },
    customerName: DataTypes.STRING,
    customerPhone: DataTypes.STRING,
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: DataTypes.TEXT,
  });

  return Order;
};
