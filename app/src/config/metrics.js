// Configuración de métricas Prometheus para la API.
// Expone las "golden signals" (método RED): tráfico, errores y latencia.

const client = require('prom-client');

// Registro propio (no el global) para tener control explícito.
const register = new client.Registry();

// Etiqueta común a todas las métricas: identifica este servicio.
register.setDefaultLabels({ service: 'tasks-api' });

// Métricas por defecto de Node.js (CPU, memoria, event loop, GC).
client.collectDefaultMetrics({ register });

// Histograma de duración de peticiones HTTP.
// Los buckets están en segundos y cubren desde 5ms hasta 5s.
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// Contador total de peticiones (para Rate y Errors).
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Número total de peticiones HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

module.exports = { register, httpRequestDuration, httpRequestsTotal };
