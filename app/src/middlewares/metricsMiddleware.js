// Middleware que cronometra cada petición y registra las métricas.
// Usa req.route para agrupar por patrón de ruta (/tasks/:id),
// no por el valor concreto (/tasks/42), evitando explosión de cardinalidad.

const { httpRequestDuration, httpRequestsTotal } = require('../config/metrics');

const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    // Agrupa por patrón de ruta cuando existe; si no, usa la ruta cruda.
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };
    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
};

module.exports = metricsMiddleware;
