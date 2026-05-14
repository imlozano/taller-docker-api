// Configuracion de ESLint
// Documentacion: https://eslint.org/docs/latest/use/configure/

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // Aplica las reglas recomendadas oficiales de JavaScript
  js.configs.recommended,

  {
    // Configuracion para todos los archivos JS
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',  // Estamos usando require()/module.exports
      globals: {
        ...globals.node,        // Reconoce process, require, __dirname, etc.
      },
    },
    rules: {
      // Avisar (no bloquear) si hay variables sin usar
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Permitir console.log (lo usamos para logs del servidor)
      'no-console': 'off',
      // Forzar uso de === en lugar de ==
      'eqeqeq': 'error',
      // Forzar comillas simples (consistencia con el codigo existente)
      'quotes': ['error', 'single', { avoidEscape: true }],
    },
  },

  {
    // Ignorar carpetas que no necesitan lint
    ignores: ['node_modules/**', 'coverage/**'],
  },
];
