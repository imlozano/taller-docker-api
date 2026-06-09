// Los controladores contienen la LÓGICA de cada endpoint.
// Reciben la petición (req), ejecutan la query a la BD,
// Y devuelven la respuesta (res).

const { pool } = require('../config/database');
const {
  parseId,
  parseCreateTask,
  parseUpdateTask,
  parseListQuery,
} = require('../validators/taskValidators');
const { parsePositiveInt } = require('../config/env');

// Advisory lock que serializa el check del tope + INSERT en createTask.
// Cualquier entero sirve mientras sea único dentro de la BD.
const TASKS_CAP_LOCK_KEY = 7341;

// Error 404 estándar para "la query no devolvió filas para ese id".
const notFound = (id) => {
  const error = new Error(`Tarea con id ${id} no encontrada`);
  error.status = 404;
  return error;
};

// GET /tasks -> Lista paginada de tareas ordenadas por fecha.
// Acepta ?limit (máx 100, def. 50) y ?offset (def. 0). Devuelve total para
// que el cliente pueda paginar sin adivinar cuántas tareas hay.
const getAllTasks = async (req, res, next) => {
  try {
    const { limit, offset } = parseListQuery(req.query);

    const [rowsResult, countResult] = await Promise.all([
      pool.query(
        'SELECT * FROM tasks ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
      pool.query('SELECT count(*)::int AS total FROM tasks'),
    ]);

    res.status(200).json({
      success: true,
      count: rowsResult.rows.length,
      total: countResult.rows[0].total,
      limit,
      offset,
      data: rowsResult.rows,
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
      return next(notFound(id));
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// POST /tasks -> Crea una nueva tarea
// La API es pública: hay un tope total de tareas (MAX_TASKS, leído dentro del
// handler para poder ajustarlo en tests) para que el spam no crezca sin
// límite. COUNT + INSERT van en una transacción serializada con un advisory
// lock: dos POST concurrentes no pueden superar el tope entre el check y el
// insert. El coste (un lock por POST) es irrelevante a 20 escrituras/min.
const createTask = async (req, res, next) => {
  let client;
  try {
    const { title } = parseCreateTask(req.body);
    const maxTasks = parsePositiveInt(process.env.MAX_TASKS, 1000);

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [TASKS_CAP_LOCK_KEY]);

    const countResult = await client.query('SELECT count(*)::int AS total FROM tasks');
    if (countResult.rows[0].total >= maxTasks) {
      await client.query('ROLLBACK');
      const error = new Error('Límite de tareas alcanzado: elimina alguna antes de crear más');
      error.status = 429;
      return next(error);
    }

    const result = await client.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      [title]
    );
    await client.query('COMMIT');

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client?.release();
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
           done  = COALESCE($2, done),
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [title, done, id]
    );

    if (result.rows.length === 0) {
      return next(notFound(id));
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
      return next(notFound(id));
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
