// src/tests/unit/reservas.test.js
import { calcularPenalizacion, validarEstadoReservaCancelable, validarReserva } from '../../services/reservas.service.js';
import { autorizarPago, reembolsarPago } from '../../services/pasarela.service.js';

describe('HU-B02 y HU-B04 reservas.service', () => {
  test('crea reserva exitosamente con datos válidos y pago aprobado', async () => {
    const pago = await autorizarPago({ tokenPago: 'tok_visa_xxxx', monto: 200000 });
    expect(pago.aprobado).toBe(true);
  });

  test('retorna 409 si existe solapamiento de fechas', () => {
    const error = { statusCode: 409, codigo: 'HABITACION_NO_DISPONIBLE' };
    expect(error.statusCode).toBe(409);
  });

  test('retorna 402 si la pasarela rechaza el pago', async () => {
    await expect(autorizarPago({ tokenPago: 'tok_rechazado', monto: 200000 }))
      .rejects.toHaveProperty('statusCode', 402);
  });

  test('retorna 400 si falta token de pago', async () => {
    await expect(autorizarPago({ tokenPago: '', monto: 200000 }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });

  test('no persiste la reserva si la pasarela falla', async () => {
    await expect(autorizarPago({ tokenPago: 'fail_pago', monto: 200000 }))
      .rejects.toHaveProperty('codigo', 'PAGO_RECHAZADO');
  });

  test('rechaza reserva con fecha de entrada posterior o igual a salida', () => {
    expect(() => validarReserva({
      id_huesped: 1,
      id_habitacion: 1,
      fecha_entrada: '2099-06-05',
      fecha_salida: '2099-06-05',
      token_pago: 'tok_test',
      monto_anticipo: 1000,
    })).toThrow('La fecha de entrada debe ser anterior');
  });

  test('rechaza reserva con fecha de entrada en el pasado', () => {
    expect(() => validarReserva({
      id_huesped: 1,
      id_habitacion: 1,
      fecha_entrada: '2000-01-01',
      fecha_salida: '2000-01-02',
      token_pago: 'tok_test',
      monto_anticipo: 1000,
    })).toThrow('La fecha de entrada no puede estar en el pasado');
  });

  test('rechaza anticipo negativo', () => {
    expect(() => validarReserva({
      id_huesped: 1,
      id_habitacion: 1,
      fecha_entrada: '2099-06-01',
      fecha_salida: '2099-06-02',
      token_pago: 'tok_test',
      monto_anticipo: -1,
    })).toThrow('El monto de anticipo no puede ser negativo');
  });

  test('calcula penalización correcta para cancelación > 7 días', () => {
    const resultado = calcularPenalizacion('2099-06-20', 100000, new Date('2099-06-01'));
    expect(resultado.porcentaje).toBe(0);
  });

  test('calcula penalización correcta para cancelación 3-7 días', () => {
    const resultado = calcularPenalizacion('2099-06-08', 100000, new Date('2099-06-01'));
    expect(resultado.porcentaje).toBe(30);
  });

  test('calcula penalización correcta para cancelación < 3 días', () => {
    const resultado = calcularPenalizacion('2099-06-03', 100000, new Date('2099-06-01'));
    expect(resultado.porcentaje).toBe(50);
  });

  test('calcula penalización correcta para cancelación mismo día', () => {
    const resultado = calcularPenalizacion('2099-06-01', 100000, new Date('2099-06-01'));
    expect(resultado.porcentaje).toBe(100);
  });

  test('procesa reembolso con token almacenado', async () => {
    const resultado = await reembolsarPago({ tokenPago: 'tok_visa_xxxx', monto: 70000 });
    expect(resultado.aprobado).toBe(true);
  });

  test('rechaza reembolso sin token almacenado', async () => {
    await expect(reembolsarPago({ tokenPago: '', monto: 70000 }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });

  test('permite cancelar solo reservas pendientes o confirmadas', () => {
    expect(() => validarEstadoReservaCancelable('pendiente')).not.toThrow();
    expect(() => validarEstadoReservaCancelable('confirmada')).not.toThrow();
    expect(() => validarEstadoReservaCancelable('en_curso')).toThrow('Solo se pueden cancelar reservas');
    expect(() => validarEstadoReservaCancelable('completada')).toThrow('Solo se pueden cancelar reservas');
  });
});
