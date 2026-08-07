const { Sequelize } = require('sequelize');
const path = require('path');

// SQLite is used so the project runs anywhere with zero external setup.
// To use Postgres/MySQL in production, swap the dialect + connection info here
// and update the DB_* variables in .env — no model code needs to change.
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', '..', 'database.sqlite'),
  logging: false,
});

module.exports = sequelize;
