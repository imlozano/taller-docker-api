// Aislamiento entre tests: vacía la tabla antes de cada uno y cierra el pool al
// final para que Jest pueda salir limpio. Se ejecuta dentro de cada worker.

const { pool } = require('../src/config/database');

beforeEach(async () => {
  await pool.query('TRUNCATE TABLE tasks RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});
