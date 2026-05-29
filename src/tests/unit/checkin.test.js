// src/tests/unit/checkin.test.js
import { jest } from '@jest/globals';
import { eventosGrandStay, emitirCodigoAcceso } from '../../services/eventos.service.js';
import { getConnection } from '../../utils/db.js';
import { logAudit } from '../../middleware/audit.middleware.js';
import { cambiarEstadoHabitacionEnTransaccion } from '../../services/habitaciones.service.js';
import {
  ESTADO_RESERVA_CHECKIN,
  registrarCheckin,
  validarEstadoReservaParaCheckin,
  validarFechaReservaParaCheckin,
} from '../../services/checkin.service.js';

jest.mock('../../utils/db.js', () => ({
  getConnection: jest.fn(),
}));

jest.mock('../../middleware/audit.middleware.js', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../services/habitaciones.service.js', () => ({
  cambiarEstadoHabitacionEnTransaccion: jest.fn(),
}));

function crearConexionMock(respuestasExecute) {
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    execute: jest.fn()
      .mockResolvedValueOnce(respuestasExecute.reserva)
      .mockResolvedValueOnce(respuestasExecute.checkinExistente)
      .mockResolvedValueOnce(respuestasExecute.insertCheckin)
      .mockResolvedValueOnce(respuestasExecute.updateReserva),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  };
}

describe('HU-B05 checkin.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registra check-in, cambia reserva a en_curso y habitacion a ocupada', async () => {
    const conn = crearConexionMock({
      reserva: [[{
        id_reserva: 42,
        id_habitacion: 7,
        estado: 'confirmada',
        fecha_entrada: '2099-06-01',
        fecha_salida: '2099-06-03',
      }]],
      checkinExistente: [[]],
      insertCheckin: [{ insertId: 15 }],
      updateReserva: [{ affectedRows: 1 }],
    });
    getConnection.mockResolvedValue(conn);
    cambiarEstadoHabitacionEnTransaccion.mockResolvedValue({ estado_nuevo: 'ocupada' });
    logAudit.mockResolvedValue();

    const resultado = await registrarCheckin(42, {
      idRecepcionista: 1,
      userId: 2,
      rol: 'Recepcionista',
      fechaActual: new Date('2099-06-01T10:00:00Z'),
    });

    expect(resultado).toMatchObject({
      id_checkin: 15,
      id_reserva: 42,
      estado_reserva: ESTADO_RESERVA_CHECKIN,
      estado_habitacion: 'ocupada',
    });
    expect(conn.execute).toHaveBeenCalledWith(
      'UPDATE reservas SET estado = :estado WHERE id_reserva = :idReserva',
      { estado: ESTADO_RESERVA_CHECKIN, idReserva: 42 },
    );
    expect(cambiarEstadoHabitacionEnTransaccion).toHaveBeenCalledWith(
      conn,
      7,
      'ocupada',
      expect.objectContaining({ accionNegocio: 'CHECKIN_HABITACION_OCUPADA' }),
    );
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.rollback).not.toHaveBeenCalled();
  });

  test('rechaza reservas canceladas, completadas o pendientes para check-in', () => {
    expect(() => validarEstadoReservaParaCheckin('cancelada')).toThrow('Solo se puede registrar check-in');
    expect(() => validarEstadoReservaParaCheckin('completada')).toThrow('Solo se puede registrar check-in');
    expect(() => validarEstadoReservaParaCheckin('pendiente')).toThrow('Solo se puede registrar check-in');
  });

  test('evita check-in duplicado sobre la misma reserva', async () => {
    const conn = crearConexionMock({
      reserva: [[{
        id_reserva: 42,
        id_habitacion: 7,
        estado: 'confirmada',
        fecha_entrada: '2099-06-01',
        fecha_salida: '2099-06-03',
      }]],
      checkinExistente: [[{ id_checkin: 99 }]],
      insertCheckin: [{ insertId: 15 }],
      updateReserva: [{ affectedRows: 1 }],
    });
    getConnection.mockResolvedValue(conn);

    await expect(registrarCheckin(42, { idRecepcionista: 1 }))
      .rejects.toMatchObject({ codigo: 'CHECKIN_DUPLICADO', statusCode: 409 });

    expect(cambiarEstadoHabitacionEnTransaccion).not.toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
  });

  test('emite evento de codigo de acceso al completar el check-in', async () => {
    const listener = jest.fn();
    eventosGrandStay.once('codigo_acceso.generado', listener);
    await emitirCodigoAcceso({ id_reserva: 1, codigo_acceso: 'GS-1234' });
    expect(listener).toHaveBeenCalledWith({ id_reserva: 1, codigo_acceso: 'GS-1234' });
  });

  test('rechaza check-in antes de la fecha de entrada', () => {
    expect(() => validarFechaReservaParaCheckin('2099-06-10', '2099-06-12', new Date('2099-06-09T10:00:00Z')))
      .toThrow('desde la fecha de entrada');
  });

  test('rechaza check-in despues de la fecha de salida', () => {
    expect(() => validarFechaReservaParaCheckin('2099-06-10', '2099-06-12', new Date('2099-06-12T10:00:00Z')))
      .toThrow('ya no permite registrar check-in');
  });
});
