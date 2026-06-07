// Se ejecuta una vez antes de toda la suite: aplica las migraciones contra el
// Postgres de test. Corre en el proceso padre (aislado de los workers), por eso
// fija su propio entorno y cierra su pool al terminar.

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
  process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_NAME = process.env.DB_NAME || 'tasksdb_test';
  process.env.DB_USER = process.env.DB_USER || 'taskuser';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'testpass';

  const { pool, initDB } = require('../src/config/database');
  await initDB();
  await pool.end();
};
