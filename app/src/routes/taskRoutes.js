// Definiendo las rutas que solo definen QUÉ URL responde a qué controlador.
// No tienen lógica, solo mapean.

const { Router } = require('express');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

const router = Router();

router.get('/',      getAllTasks);   // GET    /tasks
router.get('/:id',  getTaskById);   // GET    /tasks/:id
router.post('/',     createTask);    // POST   /tasks
router.put('/:id',  updateTask);    // PUT    /tasks/:id
router.delete('/:id', deleteTask);  // DELETE /tasks/:id

module.exports = router;