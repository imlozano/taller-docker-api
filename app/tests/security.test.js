const request = require('supertest');
const app = require('../src/app');

describe('Endpoints de seguridad / bordes', () => {
  test('GET /metrics directo (sin proxy) expone métricas Prometheus', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });

  test('GET /metrics a través de proxy (x-forwarded-for) -> 404', async () => {
    const res = await request(app).get('/metrics').set('x-forwarded-for', '1.2.3.4');
    expect(res.status).toBe(404);
  });

  test('Ruta inexistente -> 404 con shape de error', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.status).toBe(404);
  });

  test('Body JSON > 16kb -> 413', async () => {
    const huge = { title: 'a'.repeat(20 * 1024) };
    const res = await request(app).post('/tasks').send(huge);
    expect(res.status).toBe(413);
  });

  test('Respuesta incluye cabecera X-Request-Id', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('No expone X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
