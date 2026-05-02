// Configuracion de ESLint para taller-docker-api
// Documentacion: https://eslint.org/docs/latest/use/configure/

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'eqeqeq': 'error',
      'quotes': ['error', 'single', { avoidEscape: true }],
    },
  },

  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
];
