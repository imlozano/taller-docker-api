// Punto de entrada del servidor. Aquí se articulan todas las piezas:
// middlewares, rutas y la conexión a la BD.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initDB } = require('./config/database');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales --
app.use(cors());              // Permite peticiones desde otros orígenes
app.use(express.json());      // Parsea el body de las peticiones como JSON

// ── Rutas --
// Health check: Para verificar que el servidor está vivo
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/tasks', taskRoutes); // Todas las rutas de tasks

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