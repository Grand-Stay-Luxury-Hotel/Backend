// src/tests/integration/checkin.integration.test.js
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';
import { registrarCheckin } from '../../services/checkin.service.js';
import { createApp } from '../../app.js';
import { ReservaEstadoInvalidoError, ReservaNoEncontradaError } from '../../utils/errors.js';

jest.mock('../../services/checkin.service.js', () => ({
  registrarCheckin: jest.fn(),
}));

const app = createApp();
const secreto = 'secreto_pruebas_12345678901234567890';

function token(rol) {
  return jwt.sign({ id_usuario: 1, rol, id_recepcionista: 1 }, secreto);
}

describe('Integración HU-B05 check-in', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secreto;
    registrarCheckin.mockReset();
  });

  test('POST /checkin/:reservaId válido retorna 200', () => {
    registrarCheckin.mockResolvedValue({ id_checkin: 15, mensaje: 'Check-in registrado exitosamente' });
    return request(app).post('/checkin/42').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(200);
  });

  test('POST /checkin/:reservaId sin auth retorna 401', () => request(app).post('/checkin/42').send({}).expect(401));

  test('POST /checkin/:reservaId con reserva no confirmada retorna 400', () => {
    registrarCheckin.mockRejectedValue(new ReservaEstadoInvalidoError());
    return request(app).post('/checkin/42').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(400);
  });

  test('POST /checkin/:reservaId con reserva inexistente retorna 404', () => {
    registrarCheckin.mockRejectedValue(new ReservaNoEncontradaError());
    return request(app).post('/checkin/999').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(404);
  });
});
