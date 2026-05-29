// src/tests/integration/checkout.integration.test.js
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';
import { registrarCheckout } from '../../services/checkout.service.js';
import { createApp } from '../../app.js';
import { CheckoutDuplicadoError, PagoRechazadoError, ReservaEstadoInvalidoError, ReservaNoEncontradaError } from '../../utils/errors.js';

jest.mock('../../services/checkout.service.js', () => ({
  registrarCheckout: jest.fn(),
}));

const app = createApp();
const secreto = 'secreto_pruebas_12345678901234567890';

function token(rol) {
  return jwt.sign({ id_usuario: 1, rol, id_recepcionista: 1 }, secreto);
}

describe('Integracion HU-B06 check-out', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secreto;
    registrarCheckout.mockReset();
  });

  test('POST /checkout/:reservaId valido retorna 200 + resumen_factura', () => {
    registrarCheckout.mockResolvedValue({
      id_checkout: 8,
      resumen_factura: { total: 1000 },
      estado_reserva: 'completada',
      mensaje: 'Check-out procesado exitosamente',
    });
    return request(app)
      .post('/checkout/42')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.estado_reserva).toBe('completada');
      });
  });

  test('POST /checkout/:reservaId sin saldo pendiente retorna 200 sin cargo adicional', () => {
    registrarCheckout.mockResolvedValue({ id_checkout: 8, resumen_factura: { saldo_cobrado: 0 }, estado_pago: 'aprobado' });
    return request(app).post('/checkout/42').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(200);
  });

  test('POST /checkout/:reservaId con pago fallido retorna 402', () => {
    registrarCheckout.mockRejectedValue(new PagoRechazadoError());
    return request(app).post('/checkout/42').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(402);
  });

  test('POST /checkout/:reservaId con reserva inexistente retorna 404', () => {
    registrarCheckout.mockRejectedValue(new ReservaNoEncontradaError());
    return request(app).post('/checkout/999').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(404);
  });

  test('POST /checkout/:reservaId sin estadia activa retorna 400', () => {
    registrarCheckout.mockRejectedValue(new ReservaEstadoInvalidoError('Solo se puede registrar check-out para reservas con estadia activa'));
    return request(app).post('/checkout/42').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(400);
  });

  test('POST /checkout/:reservaId duplicado retorna 409', () => {
    registrarCheckout.mockRejectedValue(new CheckoutDuplicadoError());
    return request(app).post('/checkout/42').set('Authorization', `Bearer ${token('Recepcionista')}`).send({}).expect(409);
  });

  test('POST /checkout/:reservaId sin auth retorna 401', () => request(app).post('/checkout/42').send({}).expect(401));

  test('habitacion queda en estado limpieza tras checkout exitoso', () => {
    registrarCheckout.mockResolvedValue({
      id_checkout: 8,
      resumen_factura: {},
      estado_habitacion: 'limpieza',
      notificacion_encolada: true,
    });
    return request(app)
      .post('/checkout/42')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.estado_habitacion).toBe('limpieza');
        expect(res.body.notificacion_encolada).toBe(true);
      });
  });
});
