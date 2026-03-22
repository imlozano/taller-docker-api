// Este archivo maneja TODA la comunicación con PostgreSQL.

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,        
  port: process.env.DB_PORT,         
  database: process.env.DB_NAME,     
  user: process.env.DB_USER,        
  password: process.env.DB_PASSWORD, 
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