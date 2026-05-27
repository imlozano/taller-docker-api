// Punto de entrada del servidor. Aquí se articulan todas las piezas:
// middlewares, rutas y la conexión a la BD.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initDB } = require('./config/database');
const { register } = require('./config/metrics');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middlewares/errorHandler');
const metricsMiddleware = require('./middlewares/metricsMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales --

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());      // Parsea el body de las peticiones como JSON
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

// Endpoint de métricas para que Grafana Alloy lo raspe (scrape).
// Caddy bloquea /metrics desde internet; solo se accede por loopback.
app.get('/metrics', async (req, res) => {
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