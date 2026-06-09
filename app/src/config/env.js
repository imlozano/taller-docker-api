// Parseo defensivo de variables de entorno numéricas. Number('abc') o un env
// vacío producen NaN, y NaN en una comparación desactiva silenciosamente el
// límite que debía proteger: aquí cualquier valor inválido cae al default.

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = { parsePositiveInt };
