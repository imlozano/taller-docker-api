// Tests del graceful shutdown de server.js. No levantan un listener real:
// se inyecta un server falso y se emiten las señales con process.emit, así
// validamos la secuencia close -> pool.end -> exit sin matar el proceso de Jest.

const { pool } = require('../src/config/database');
const { setupGracefulShutdown } = require('../src/server');

// Da una vuelta al event loop para que los callbacks async del shutdown corran.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('Graceful shutdown', () => {
  let exitSpy;
  let endSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    // pool.end real cerraría el pool que usa el resto de la suite.
    endSpy = jest.spyOn(pool, 'end').mockResolvedValue();
  });

  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    exitSpy.mockRestore();
    endSpy.mockRestore();
  });

  test('SIGTERM cierra el server, drena el pool y sale con 0', async () => {
    const close = jest.fn((cb) => cb());
    setupGracefulShutdown({ close });

    process.emit('SIGTERM');
    await flush();

    expect(close).toHaveBeenCalledTimes(1);
    expect(endSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test('SIGINT también dispara el shutdown', async () => {
    const close = jest.fn((cb) => cb());
    setupGracefulShutdown({ close });

    process.emit('SIGINT');
    await flush();

    expect(close).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test('señales repetidas no cierran dos veces (guard shuttingDown)', async () => {
    const close = jest.fn((cb) => cb());
    setupGracefulShutdown({ close });

    process.emit('SIGTERM');
    process.emit('SIGTERM');
    process.emit('SIGINT');
    await flush();

    expect(close).toHaveBeenCalledTimes(1);
  });

  test('si drenar el pool falla, sale con 1', async () => {
    endSpy.mockRejectedValueOnce(new Error('pool roto'));
    const close = jest.fn((cb) => cb());
    setupGracefulShutdown({ close });

    process.emit('SIGTERM');
    await flush();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
