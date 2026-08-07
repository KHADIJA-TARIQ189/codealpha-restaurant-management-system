require('dotenv').config();
const app = require('../src/app');
const { sequelize } = require('../src/models');

let synced = false;
async function ensureReady(req, res, next) {
  if (!synced) {
    await sequelize.authenticate();
    await sequelize.sync();
    synced = true;
  }
  next();
}

app.use(ensureReady);

module.exports = app;