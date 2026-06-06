// Punto de entrada del proceso: carga env, inicializa la BD, arranca el HTTP
// server y gestiona el apagado controlado (graceful shutdown).

require('dotenv').config();

const app = require('./app');
const { pool, initDB } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await initDB();           // Aplica el esquema/migraciones antes de aceptar tráfico
    const server = app.listen(PORT, () => {
      logger.info(`Servidor corriendo en http://localhost:${PORT}`);
    });
    setupGracefulShutdown(server);
  } catch (error) {
    logger.error({ err: error }, 'Error al iniciar el servidor');
    process.exit(1);           // Si falla la BD, el proceso termina
  }
};

// Apagado controlado: Docker envía SIGTERM en `compose down`/redeploy. Sin esto,
// el proceso muere de golpe dejando conexiones a medias y posibles 5xx. Aquí
// dejamos de aceptar conexiones, drenamos el pool de PostgreSQL y salimos. Un
// timeout de seguridad fuerza la salida si algo se cuelga.
const setupGracefulShutdown = (server) => {
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} recibido: cerrando servidor...`);

    const forceExit = setTimeout(() => {
      logger.error('Cierre forzado tras timeout de 10s');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await pool.end();
        logger.info('Pool de PostgreSQL drenado. Adiós.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error drenando el pool');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
