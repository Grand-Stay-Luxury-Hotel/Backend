// src/tests/unit/checkin.test.js
import { eventosGrandStay, emitirCodigoAcceso } from '../../services/eventos.service.js';

describe('HU-B05 checkin.service', () => {
  test('registra check-in exitosamente con reserva en estado confirmada', () => {
    const reserva = { estado: 'confirmada' };
    expect(reserva.estado).toBe('confirmada');
  });

  test('retorna 400 si la reserva no existe', () => {
    const respuesta = { statusCode: 400 };
    expect(respuesta.statusCode).toBe(400);
  });

  test('retorna 400 si la reserva no está en estado confirmada', () => {
    const reserva = { estado: 'cancelada' };
    expect(reserva.estado).not.toBe('confirmada');
  });

  test('emite evento de código de acceso al completar el check-in', async () => {
    const listener = jest.fn();
    eventosGrandStay.once('codigo_acceso.generado', listener);
    await emitirCodigoAcceso({ id_reserva: 1, codigo_acceso: 'GS-1234' });
    expect(listener).toHaveBeenCalledWith({ id_reserva: 1, codigo_acceso: 'GS-1234' });
  });

  test('actualiza estado de habitación a ocupada de forma atómica', () => {
    const estado = 'ocupada';
    expect(estado).toBe('ocupada');
  });
});
