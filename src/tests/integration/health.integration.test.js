// src/tests/integration/health.integration.test.js
import request from 'supertest';
import { jest } from '@jest/globals';
import { createApp } from '../../app.js';
import { query } from '../../utils/db.js';

jest.mock('../../utils/db.js', () => ({
  query: jest.fn(),
}));

const app = createApp();

describe('Integracion health checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health/db valida conexion sin exponer credenciales', () => {
    process.env.DB_HOST = 'aiven.example.com';
    process.env.DB_SSL_MODE = 'REQUIRED';
    query.mockResolvedValue([{ base_datos: 'grandstay_db', version_mysql: '8.0.35' }]);

    return request(app)
      .get('/health/db')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          estado: 'ok',
          base_datos: 'grandstay_db',
          motor: 'mysql',
          conexion: 'aiven_o_remota',
          ssl: 'REQUIRED',
        });
        expect(JSON.stringify(res.body)).not.toContain('password');
      });
  });
});
