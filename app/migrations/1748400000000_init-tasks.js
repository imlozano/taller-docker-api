// Migración inicial: tabla tasks. Sustituye al antiguo CREATE TABLE IF NOT
// EXISTS de initDB. Es idempotente (ifNotExists) para no chocar con la tabla
// que ya existe en el servidor de producción creado por la versión anterior.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable(
    'tasks',
    {
      id: 'id', // serial primary key
      title: { type: 'varchar(255)', notNull: true },
      done: { type: 'boolean', notNull: true, default: false },
      created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    },
    { ifNotExists: true }
  );

  // Para DBs preexistentes (creadas por initDB sin esta columna).
  pgm.addColumn(
    'tasks',
    { updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') } },
    { ifNotExists: true }
  );

  // Listado ordena por created_at DESC; el índice evita un sort sobre toda la tabla.
  pgm.createIndex('tasks', 'created_at', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('tasks');
};
