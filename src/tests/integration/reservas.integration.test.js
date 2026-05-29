// src/tests/integration/reservas.integration.test.js
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';
import { crearReserva, cancelarReserva, listarReservas } from '../../services/reservas.service.js';
import { createApp } from '../../app.js';
import { OverbookingError, PagoRechazadoError, ReservaNoEncontradaError } from '../../utils/errors.js';

jest.mock('../../services/reservas.service.js', () => ({
  crearReserva: jest.fn(),
  cancelarReserva: jest.fn(),
  listarReservas: jest.fn(),
  listarReservasHuesped: jest.fn(),
}));

const app = createApp();
const secreto = 'secreto_pruebas_12345678901234567890';

function token(rol) {
  return jwt.sign({ id_usuario: 1, rol, id_recepcionista: 1 }, secreto);
}

describe('Integración HU-B02 y HU-B04 reservas', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secreto;
    crearReserva.mockReset();
    cancelarReserva.mockReset();
    listarReservas.mockReset();
  });

  test('GET /reservas permite listar reservas para selectores del frontend', () => {
    listarReservas.mockResolvedValue({
      data: [{ id_reserva: 42, codigo_confirmacion: 'GS-42', huesped_nombre: 'Sofia Torres' }],
      total: 1,
    });

    return request(app)
      .get('/reservas?buscar=Sofia')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .expect(200)
      .expect((res) => expect(res.body.data[0].codigo_confirmacion).toBe('GS-42'));
  });

  test('POST /reservas con datos válidos retorna 201', () => {
    crearReserva.mockResolvedValue({ id_reserva: 42, estado: 'confirmada', mensaje: 'Reserva creada exitosamente' });
    return request(app).post('/reservas').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(201);
  });

  test('POST /reservas sin auth retorna 401', () => request(app).post('/reservas').send({}).expect(401));

  test('POST /reservas con habitación ya reservada retorna 409', () => {
    crearReserva.mockRejectedValue(new OverbookingError());
    return request(app).post('/reservas').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(409);
  });

  test('POST /reservas con pago rechazado retorna 402', () => {
    crearReserva.mockRejectedValue(new PagoRechazadoError());
    return request(app).post('/reservas').set('Authorization', `Bearer ${token('Huesped')}`).send({}).expect(402);
  });

  test('DELETE /reservas/:id válida retorna 200 + penalización calculada', () => {
    cancelarReserva.mockResolvedValue({ mensaje: 'Reserva cancelada exitosamente', penalizacion_aplicada: 30, monto_reembolso: 140000 });
    return request(app).delete('/reservas/1').set('Authorization', `Bearer ${token('Administrador')}`).expect(200);
  });

  test('DELETE /reservas/:id no encontrada retorna 404', () => {
    cancelarReserva.mockRejectedValue(new ReservaNoEncontradaError());
    return request(app).delete('/reservas/999').set('Authorization', `Bearer ${token('Recepcionista')}`).expect(404);
  });

  test('DELETE /reservas/:id sin permisos retorna 403', () => request(app)
    .delete('/reservas/1')
    .set('Authorization', `Bearer ${token('Huesped')}`)
    .expect(403));
});
