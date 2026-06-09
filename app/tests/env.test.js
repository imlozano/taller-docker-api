const { parsePositiveInt } = require('../src/config/env');

describe('parsePositiveInt', () => {
  test('parsea enteros positivos válidos', () => {
    expect(parsePositiveInt('20', 5)).toBe(20);
    expect(parsePositiveInt('1000', 5)).toBe(1000);
  });

  test('cae al default con valores vacíos, no numéricos, cero o negativos', () => {
    expect(parsePositiveInt(undefined, 5)).toBe(5);
    expect(parsePositiveInt('', 5)).toBe(5);
    expect(parsePositiveInt('abc', 5)).toBe(5);
    expect(parsePositiveInt('NaN', 5)).toBe(5);
    expect(parsePositiveInt('0', 5)).toBe(5);
    expect(parsePositiveInt('-3', 5)).toBe(5);
  });
});
