module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define('Reservation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    partySize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    reservationTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 90,
    },
    status: {
      type: DataTypes.ENUM('confirmed', 'seated', 'completed', 'cancelled', 'no_show'),
      defaultValue: 'confirmed',
    },
    notes: DataTypes.TEXT,
  });

  return Reservation;
};
