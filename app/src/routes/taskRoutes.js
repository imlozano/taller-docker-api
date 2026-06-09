// Definiendo las rutas que solo definen QUÉ URL responde a qué controlador.
// No tienen lógica, solo mapean.

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

const router = Router();

// La API es pública (sin auth): las escrituras llevan un límite mucho más
// estricto que el global de 120/min. Overridable por env para los tests.
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.WRITE_RATE_LIMIT || 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Demasiadas escrituras, intenta en un minuto', status: 429 } },
});

router.get('/',      getAllTasks);   // GET    /tasks
router.get('/:id',  getTaskById);   // GET    /tasks/:id
router.post('/',     writeLimiter, createTask);    // POST   /tasks
router.put('/:id',  writeLimiter, updateTask);    // PUT    /tasks/:id
router.delete('/:id', writeLimiter, deleteTask);  // DELETE /tasks/:id

module.exports = router;