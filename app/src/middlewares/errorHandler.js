// Middleware global de manejo de errores.
// Llega aquí en vez de romper el servidor.

const errorHandler = (err, req, res, _next) => {
  console.error('❌ Error:', err.message);

  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Error interno del servidor',
      status,
    },
  });
};

module.exports = errorHandler;
