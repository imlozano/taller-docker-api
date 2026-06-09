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
// CORS es fail-closed en todos los modos: la app no arranca sin orígenes.
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
// El límite de escrituras (20/min en prod) haría flaky la suite: se sube aquí.
process.env.WRITE_RATE_LIMIT = process.env.WRITE_RATE_LIMIT || '1000';
