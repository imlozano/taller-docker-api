const request = require('supertest');
const app = require('../src/app');

describe('CRUD /tasks', () => {
  test('POST crea una tarea (201) y la devuelve', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Comprar pan' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ title: 'Comprar pan', done: false });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.created_at).toBeDefined();
  });

  test('GET lista paginada con total, limit y offset', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });

    const res = await request(app).get('/tasks?limit=1&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.count).toBe(1);
    expect(res.body.limit).toBe(1);
    expect(res.body.offset).toBe(0);
    expect(res.body.data).toHaveLength(1);
  });

  test('GET /:id devuelve la tarea', async () => {
    const created = await request(app).post('/tasks').send({ title: 'X' });
    const res = await request(app).get(`/tasks/${created.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('X');
  });

  test('PUT actualiza title y done y refresca updated_at', async () => {
    const created = await request(app).post('/tasks').send({ title: 'viejo' });
    const id = created.body.data.id;
    const res = await request(app).put(`/tasks/${id}`).send({ title: 'nuevo', done: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'nuevo', done: true });
  });

  test('DELETE elimina la tarea', async () => {
    const created = await request(app).post('/tasks').send({ title: 'borrar' });
    const id = created.body.data.id;
    const del = await request(app).delete(`/tasks/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    const after = await request(app).get(`/tasks/${id}`);
    expect(after.status).toBe(404);
  });
});

describe('Validación y errores', () => {
  test('POST con title vacío -> 400', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.status).toBe(400);
  });

  test('POST con title > 255 -> 400', async () => {
    const res = await request(app).post('/tasks').send({ title: 'a'.repeat(256) });
    expect(res.status).toBe(400);
  });

  test('GET /:id no numérico -> 400', async () => {
    const res = await request(app).get('/tasks/abc');
    expect(res.status).toBe(400);
  });

  test('GET /:id inexistente -> 404', async () => {
    const res = await request(app).get('/tasks/999999');
    expect(res.status).toBe(404);
  });

  test('PUT sin campos -> 400', async () => {
    const created = await request(app).post('/tasks').send({ title: 'y' });
    const res = await request(app).put(`/tasks/${created.body.data.id}`).send({});
    expect(res.status).toBe(400);
  });

  test('DELETE inexistente -> 404', async () => {
    const res = await request(app).delete('/tasks/999999');
    expect(res.status).toBe(404);
  });

  test('limit fuera de rango (>100) -> 400', async () => {
    const res = await request(app).get('/tasks?limit=500');
    expect(res.status).toBe(400);
  });

  test('error inesperado de BD -> 500 con requestId, sin filtrar detalles', async () => {
    const { pool } = require('../src/config/database');
    const spy = jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('boom interno'));
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Internal server error');
    expect(res.body.error.requestId).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('boom interno');
    spy.mockRestore();
  });
});
