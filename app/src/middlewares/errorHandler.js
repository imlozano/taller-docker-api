// Middleware global de manejo de errores.
// Los 4xx mantienen mensaje (son intencionales y útiles para el cliente).
// Los 5xx se ocultan tras un mensaje genérico + requestId para correlacionar
// con el log del servidor sin filtrar stack traces ni detalles internos.
// El requestId es el mismo que asigna pino-http (req.id), así la respuesta al
// cliente y la línea de log comparten identificador.

const { randomUUID } = require('node:crypto');

const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  // Defensa: si por lo que sea pino-http no corrió (error muy temprano), no
  // queremos que el propio handler tire un TypeError y se trague el error real.
  const requestId = req.id || randomUUID();
  const log = req.log || console;

  if (status >= 500) {
    log.error({ err, requestId }, `${req.method} ${req.originalUrl} -> ${status}`);
    return res.status(status).json({
      error: { message: 'Internal server error', status, requestId },
    });
  }

  log.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  res.status(status).json({
    error: { message: err.message || 'Bad request', status },
  });
};

module.exports = errorHandler;
