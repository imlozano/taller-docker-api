// Punto de entrada del servidor. Aquí se articulan todas las piezas:
// middlewares, rutas y la conexión a la BD.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDB } = require('./config/database');
const { register } = require('./config/metrics');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middlewares/errorHandler');
const metricsMiddleware = require('./middlewares/metricsMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Estamos detrás de Caddy en producción: necesitamos confiar en X-Forwarded-*
// para que req.ip y rate-limit funcionen con la IP real del cliente.
app.set('trust proxy', 1);

// Ocultar firma del framework (defensa menor pero estándar).
app.disable('x-powered-by');

// ── CORS fail-closed --

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN es obligatorio en producción');
}

app.use(cors({
  origin(origin, cb) {
    // Permitir requests sin Origin (curl, server-to-server, healthchecks).
    if (!origin) return cb(null, true);
    if (corsOrigins.length === 0) return cb(null, true); // dev sin CORS_ORIGIN
    return corsOrigins.includes(origin)
      ? cb(null, true)
      : cb(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Headers de seguridad (HSTS lo añade Caddy ya que es quien termina TLS).
app.use(helmet({ hsts: false }));

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
// Health check: Para verificar que el servidor está vivo
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    environment: process.env.NODE_ENV || 'production',
  });
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

// ── Arranque del servidor --
const start = async () => {
  try {
    await initDB();           // Inicializa la tabla en PostgreSQL
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);           // Si falla la BD, el proceso termina
  }
};

start();
