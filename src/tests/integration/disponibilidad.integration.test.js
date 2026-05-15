// src/tests/integration/disponibilidad.integration.test.js
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';
import { query } from '../../utils/db.js';
import { createApp } from '../../app.js';

jest.mock('../../utils/db.js', () => ({
  query: jest.fn(),
}));

const app = createApp();
const secreto = 'secreto_pruebas_12345678901234567890';

function token(rol) {
  return jwt.sign({ id_usuario: 1, rol, id_recepcionista: 1 }, secreto);
}

describe('Integración HU-B01 disponibilidad', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secreto;
    query.mockReset();
  });

  test('GET /habitaciones/disponibilidad con params válidos retorna 200 + array', () => {
    query.mockResolvedValue([{ id_habitacion: 1 }]);
    return request(app)
      .get('/habitaciones/disponibilidad?fechaEntrada=2099-06-01&fechaSalida=2099-06-05')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .expect(200)
      .expect((res) => expect(Array.isArray(res.body.data)).toBe(true));
  });

  test('GET /habitaciones/disponibilidad sin auth retorna 401', () => request(app)
    .get('/habitaciones/disponibilidad?fechaEntrada=2099-06-01&fechaSalida=2099-06-05')
    .expect(401));

  test('GET /habitaciones/disponibilidad con rol no autorizado retorna 403', () => request(app)
    .get('/habitaciones/disponibilidad?fechaEntrada=2099-06-01&fechaSalida=2099-06-05')
    .set('Authorization', `Bearer ${token('Administrador')}`)
    .expect(403));

  test('GET /habitaciones/disponibilidad fechaEntrada >= fechaSalida retorna 400', () => request(app)
    .get('/habitaciones/disponibilidad?fechaEntrada=2099-06-05&fechaSalida=2099-06-01')
    .set('Authorization', `Bearer ${token('Recepcionista')}`)
    .expect(400));

  test('GET /habitaciones/disponibilidad sin params requeridos retorna 400', () => request(app)
    .get('/habitaciones/disponibilidad')
    .set('Authorization', `Bearer ${token('Recepcionista')}`)
    .expect(400));

  test('GET /habitaciones/disponibilidad sin resultados retorna 200 + array vacío', () => {
    query.mockResolvedValue([]);
    return request(app)
      .get('/habitaciones/disponibilidad?fechaEntrada=2099-06-01&fechaSalida=2099-06-05')
      .set('Authorization', `Bearer ${token('Huesped')}`)
      .expect(200)
      .expect((res) => expect(res.body.data).toEqual([]));
  });
});
