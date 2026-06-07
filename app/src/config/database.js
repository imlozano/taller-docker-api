// Este archivo maneja TODA la comunicación con PostgreSQL.

const path = require('node:path');
const { Pool } = require('pg');
const logger = require('./logger');

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
  logger.error({ err }, 'Error inesperado en cliente del pool');
});

// Aplica las migraciones pendientes al arrancar. node-pg-migrate v8 es ESM-only,
// por eso se carga con import() dinámico desde este módulo CommonJS. Reutiliza
// un cliente del pool para no abrir una conexión extra.
const initDB = async () => {
  const { runner } = await import('node-pg-migrate');
  const client = await pool.connect();
  try {
    await runner({
      dbClient: client,
      dir: path.join(__dirname, '..', '..', 'migrations'),
      direction: 'up',
      count: Infinity,
      migrationsTable: 'pgmigrations',
      logger,
    });
    logger.info('Migraciones aplicadas correctamente');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
