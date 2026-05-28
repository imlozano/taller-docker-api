// Este archivo maneja TODA la comunicación con PostgreSQL.

const { Pool } = require('pg');

// Fallar al arranque si falta alguna variable: mejor un crash temprano
// con mensaje claro que conexiones colgadas en producción.
const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(`Faltan variables de entorno de BD: ${missing.join(', ')}`);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Errores asíncronos del pool (p.ej. conexión muerta) no deben tirar el proceso.
pool.on('error', (err) => {
  console.error('Error inesperado en cliente del pool:', err);
});

// Función para inicializar la tabla si no existe.
// Se ejecuta una vez al arrancar el servidor.
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id        SERIAL PRIMARY KEY,
      title     VARCHAR(255) NOT NULL,
      done      BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Base de datos inicializada correctamente');
};

module.exports = { pool, initDB };
