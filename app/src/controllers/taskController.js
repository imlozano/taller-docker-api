// Los controladores contienen la LÓGICA de cada endpoint.
// Reciben la petición (req), ejecutan la query a la BD,
// Y devuelven la respuesta (res).

const { pool } = require('../config/database');
const {
  parseId,
  parseCreateTask,
  parseUpdateTask,
} = require('../validators/taskValidators');

// GET /tasks -> Retorna todas las tareas ordenadas por fecha
const getAllTasks = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error); // Pasa el error al errorHandler
  }
};

// GET /tasks/:id -> Retorna una tarea por su ID
const getTaskById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      const error = new Error(`Tarea con id ${id} no encontrada`);
      error.status = 404;
      return next(error);
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// POST /tasks -> Crea una nueva tarea
const createTask = async (req, res, next) => {
  try {
    const { title } = parseCreateTask(req.body);

    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      [title]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:id -> Actualiza una tarea (título o estado done)
const updateTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { title, done } = parseUpdateTask(req.body);

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           done  = COALESCE($2, done)
       WHERE id = $3
       RETURNING *`,
      [title, done, id]
    );

    if (result.rows.length === 0) {
      const error = new Error(`Tarea con id ${id} no encontrada`);
      error.status = 404;
      return next(error);
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// DELETE /tasks/:id -> Elimina una tarea por su ID
const deleteTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      const error = new Error(`Tarea con id ${id} no encontrada`);
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: `Tarea "${result.rows[0].title}" eliminada correctamente`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
