// Variables de entorno para el entorno de test. Se ejecuta por worker ANTES de
// cargar la app, de modo que config/database.js encuentre las DB_* al cargarse.
// Los valores son overridables (CI inyecta DB_HOST=postgres, etc.).

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'tasksdb_test';
process.env.DB_USER = process.env.DB_USER || 'taskuser';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'testpass';
// Sin CORS_ORIGIN: en NODE_ENV=test el modo fail-closed no aplica (solo en prod).
