// Construye y exporta la instancia de Express (middlewares + rutas + errores).
// NO arranca el servidor ni abre conexiones: eso vive en server.js.
// Separar construcción de arranque permite montar la app en tests (Supertest)
// sin ocupar un puerto.

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { randomUUID } = require('node:crypto');

const { pool } = require('./config/database');
const { register } = require('./config/metrics');
const logger = require('./config/logger');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middlewares/errorHandler');
const metricsMiddleware = require('./middlewares/metricsMiddleware');

const app = express();

// Estamos detrás de Caddy en producción: necesitamos confiar en X-Forwarded-*
// para que req.ip y rate-limit funcionen con la IP real del cliente.
app.set('trust proxy', 1);

// Ocultar firma del framework (defensa menor pero estándar).
app.disable('x-powered-by');

// Logging por request: asigna un requestId (reusa X-Request-Id si viene del
// proxy) y lo expone en req.id / req.log. Ese mismo id se devuelve al cliente
// en los errores 5xx, así un usuario puede citarlo y correlacionar con el log.
app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = existing || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
}));

// ── CORS fail-closed --

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Fail-closed en TODOS los modos: sin lista de orígenes la app no arranca.
// Así el comportamiento de dev/test no diverge del de producción.
if (corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN es obligatorio (en dev usa http://localhost:3000)');
}

app.use(cors({
  origin(origin, cb) {
    // Permitir requests sin Origin (curl, server-to-server, healthchecks).
    if (!origin) return cb(null, true);
    return corsOrigins.includes(origin)
      ? cb(null, true)
      : cb(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Headers de seguridad (HSTS lo añade Caddy ya que es quien termina TLS).
app.use(helmet({ hsts: false }));

// Compresión de respuestas (los listados JSON de /tasks comprimen muy bien).
app.use(compression());

// Body parser con límite agresivo: la API solo recibe títulos cortos.
app.use(express.json({ limit: '16kb' }));

// Rate limit: 120 req/min por IP. Generoso para uso normal, freno para abuso.
app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

app.use(metricsMiddleware);   // Mide todas las peticiones (RED: rate/errors/duration)

// ── Rutas --
// Liveness: el proceso está vivo y aceptando peticiones. NO toca la BD.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    environment: process.env.NODE_ENV || 'production',
  });
});

// Readiness: ¿puede la app servir tráfico real? Verifica la BD con un SELECT 1.
// Devuelve 503 si Postgres no responde, para que el orquestador no le mande
// tráfico (y el healthcheck de Docker lo marque unhealthy).
app.get('/health/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (err) {
    (req.log ?? logger).error({ err }, 'readiness check falló: BD no disponible');
    res.status(503).json({ status: 'unavailable', reason: 'database' });
  }
});

app.use('/tasks', taskRoutes); // Todas las rutas de tasks

// Endpoint de métricas para Grafana Alloy. Defensa en profundidad: Caddy
// devuelve 404 desde internet, y aquí rechazamos cualquier request que
// haya pasado por un proxy. Alloy raspa el contenedor directo (sin
// X-Forwarded-For); cualquier request a través de Caddy lo lleva.
app.get('/metrics', async (req, res) => {
  if (req.headers['x-forwarded-for']) {
    return res.status(404).json({ error: { message: 'Ruta no encontrada', status: 404 } });
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Ruta no encontrada (404) --
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Ruta no encontrada', status: 404 } });
});

// ── Manejo global de errores --
app.use(errorHandler);

module.exports = app;
