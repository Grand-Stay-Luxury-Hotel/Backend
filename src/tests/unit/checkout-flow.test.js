// src/tests/unit/checkout-flow.test.js
import { jest } from '@jest/globals';
import { getConnection } from '../../utils/db.js';
import { logAudit } from '../../middleware/audit.middleware.js';
import { cobrarSaldo } from '../../services/pasarela.service.js';
import { emitirFacturaGenerada } from '../../services/eventos.service.js';
import { cambiarEstadoHabitacionEnTransaccion } from '../../services/habitaciones.service.js';
import {
  ESTADO_HABITACION_POST_CHECKOUT,
  ESTADO_RESERVA_CHECKOUT,
  registrarCheckout,
  validarEstadoReservaParaCheckout,
} from '../../services/checkout.service.js';

jest.mock('../../utils/db.js', () => ({
  getConnection: jest.fn(),
}));

jest.mock('../../middleware/audit.middleware.js', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../services/pasarela.service.js', () => ({
  cobrarSaldo: jest.fn(),
}));

jest.mock('../../services/eventos.service.js', () => ({
  emitirFacturaGenerada: jest.fn(),
}));

jest.mock('../../services/habitaciones.service.js', () => ({
  cambiarEstadoHabitacionEnTransaccion: jest.fn(),
}));

const reservaActiva = {
  id_reserva: 42,
  id_habitacion: 7,
  id_checkin: 15,
  id_checkout: null,
  id_tipo_habitacion: 2,
  id_usuario_huesped: 9,
  email_huesped: 'huesped@test.com',
  codigo_confirmacion: 'GS-42',
  fecha_entrada: '2099-06-01',
  fecha_salida: '2099-06-03',
  monto_pagado: 100000,
  token: 'tok_visa_xxxx',
  estado: 'en_curso',
};

function crearConexionMock(reserva = reservaActiva) {
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    execute: jest.fn()
      .mockResolvedValueOnce([[reserva]])
      .mockResolvedValueOnce([[{ precio_noche: 200000 }]])
      .mockResolvedValueOnce([[{ cantidad: 1, precio_unitario: 50000 }]])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{ insertId: 40 }]),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  };
}

describe('HU-B06 checkout flujo activo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cobrarSaldo.mockResolvedValue({ aprobado: true, monto: 0, referencia: 'PAY-1', proveedor: 'Wompi' });
    cambiarEstadoHabitacionEnTransaccion.mockResolvedValue({ estado_nuevo: ESTADO_HABITACION_POST_CHECKOUT });
    logAudit.mockResolvedValue();
    emitirFacturaGenerada.mockResolvedValue();
  });

  test('finaliza reserva en_curso y cambia habitacion a limpieza', async () => {
    const conn = crearConexionMock();
    getConnection.mockResolvedValue(conn);

    const resultado = await registrarCheckout(42, {
      idRecepcionista: 1,
      userId: 2,
      rol: 'Recepcionista',
    });

    expect(resultado).toMatchObject({
      id_checkout: 20,
      estado_reserva: ESTADO_RESERVA_CHECKOUT,
      estado_habitacion: ESTADO_HABITACION_POST_CHECKOUT,
    });
    expect(conn.execute).toHaveBeenCalledWith(
      'UPDATE reservas SET estado = :estado WHERE id_reserva = :idReserva',
      { estado: ESTADO_RESERVA_CHECKOUT, idReserva: 42 },
    );
    expect(cambiarEstadoHabitacionEnTransaccion).toHaveBeenCalledWith(
      conn,
      7,
      ESTADO_HABITACION_POST_CHECKOUT,
      expect.objectContaining({ accionNegocio: 'CHECKOUT_HABITACION_LIMPIEZA' }),
    );
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.rollback).not.toHaveBeenCalled();
  });

  test('rechaza reservas sin estadia activa', () => {
    expect(() => validarEstadoReservaParaCheckout('confirmada', 15)).toThrow('estadia activa');
    expect(() => validarEstadoReservaParaCheckout('pendiente', 15)).toThrow('estadia activa');
    expect(() => validarEstadoReservaParaCheckout('cancelada', 15)).toThrow('estadia activa');
    expect(() => validarEstadoReservaParaCheckout('completada', 15)).toThrow('estadia activa');
    expect(() => validarEstadoReservaParaCheckout('en_curso', null)).toThrow('estadia activa');
  });

  test('evita checkout duplicado sobre la misma reserva', async () => {
    const conn = crearConexionMock({ ...reservaActiva, id_checkout: 99 });
    getConnection.mockResolvedValue(conn);

    await expect(registrarCheckout(42, { idRecepcionista: 1 }))
      .rejects.toMatchObject({ codigo: 'CHECKOUT_DUPLICADO', statusCode: 409 });

    expect(cobrarSaldo).not.toHaveBeenCalled();
    expect(cambiarEstadoHabitacionEnTransaccion).not.toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
  });
});
