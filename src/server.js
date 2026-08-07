require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Plain sync() only creates tables that don't exist yet — it never touches existing
    // tables/data. Set DB_SYNC_ALTER=true in .env if you want Sequelize to try to
    // reconcile schema changes automatically during development, but note that on SQLite
    // "alter" can rebuild a table (and silently lose rows) rather than issue a clean ALTER.
    // In production, prefer real migrations over either of these.
    const shouldAlter = process.env.DB_SYNC_ALTER === 'true';
    await sequelize.sync({ alter: shouldAlter });
    console.log(`Models synced${shouldAlter ? ' (alter mode)' : ''}.`);

    app.listen(PORT, () => {
      console.log(`Restaurant Management System API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
