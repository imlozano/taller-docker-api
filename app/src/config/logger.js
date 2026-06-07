// Logger estructurado (pino). Emite JSON por stdout: lo recoge Docker y de ahí
// Grafana Alloy/Loki sin parseo frágil. En tests bajamos el nivel para no ruido.

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  // redactar cabeceras sensibles por si se loguean requests con auth a futuro.
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

module.exports = logger;
