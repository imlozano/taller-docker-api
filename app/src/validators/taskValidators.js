// Validación de entrada con Zod. Devolver 400 con el primer issue legible
// es más útil que dejar que el controlador falle por valores raros.

const { z } = require('zod');

const idSchema = z.coerce.number().int().positive();

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(255),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.done !== undefined, {
    message: 'Debe enviar al menos title o done',
  });

// Paginación de GET /tasks: limit acotado (máx 100) y offset no negativo.
// Coaccionamos desde query string (siempre llega como texto) y damos defaults.
const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const parseOrThrow = (schema, value) => {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  const err = new Error(parsed.error.issues[0]?.message || 'Datos inválidos');
  err.status = 400;
  throw err;
};

module.exports = {
  parseId: (raw) => parseOrThrow(idSchema, raw),
  parseCreateTask: (raw) => parseOrThrow(createTaskSchema, raw),
  parseUpdateTask: (raw) => parseOrThrow(updateTaskSchema, raw),
  parseListQuery: (raw) => parseOrThrow(listQuerySchema, raw),
};
