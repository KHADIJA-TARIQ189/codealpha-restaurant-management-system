module.exports = (sequelize, DataTypes) => {
  const MenuItem = sequelize.define('MenuItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    category: {
      // e.g. Starter, Main Course, Dessert, Beverage
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Main Course',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    isAvailable: {
      // Toggled manually by admin, or automatically when an ingredient runs out
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    imageUrl: DataTypes.STRING,
  });

  return MenuItem;
};
