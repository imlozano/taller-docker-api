const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('Health checks', () => {
  test('GET /health (liveness) -> 200 sin tocar la BD', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBeDefined();
  });

  test('GET /health/ready (readiness) -> 200 con BD disponible', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  test('GET /health/ready -> 503 si la BD falla', async () => {
    // Simula caída de BD interceptando una sola query.
    const spy = jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unavailable');
    spy.mockRestore();
  });
});
