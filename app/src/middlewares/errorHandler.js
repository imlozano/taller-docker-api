// Middleware global de manejo de errores.
// Los 4xx mantienen mensaje (son intencionales y útiles para el cliente).
// Los 5xx se ocultan tras un mensaje genérico + requestId para correlacionar
// con el log del servidor sin filtrar stack traces ni detalles internos.

const { randomUUID } = require('node:crypto');

const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;

  if (status >= 500) {
    const requestId = randomUUID();
    console.error(`[${requestId}] ${req.method} ${req.originalUrl} ->`, err);
    return res.status(status).json({
      error: { message: 'Internal server error', status, requestId },
    });
  }

  console.error(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  res.status(status).json({
    error: { message: err.message || 'Bad request', status },
  });
};

module.exports = errorHandler;
