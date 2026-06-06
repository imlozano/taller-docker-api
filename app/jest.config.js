// Configuración de Jest. Tests de integración contra un Postgres real (efímero):
// nada de mocks de BD, así validamos SQL, migraciones y validación de punta a punta.

module.exports = {
  testEnvironment: 'node',
  // Carga variables de entorno (DB_*, NODE_ENV=test) antes de cargar la app.
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  // Aplica migraciones una vez antes de toda la suite.
  globalSetup: '<rootDir>/tests/global-setup.js',
  // Limpia la tabla entre tests y cierra el pool al terminar.
  setupFilesAfterEnv: ['<rootDir>/tests/setup-after-env.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // arranca el proceso/listener; se prueba vía Supertest sobre app.js
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 60,
    },
  },
};
