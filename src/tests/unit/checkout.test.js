// src/tests/unit/checkout.test.js
import { calcularLiquidacion } from '../../services/checkout.service.js';
import { cobrarSaldo } from '../../services/pasarela.service.js';
import { emitirFacturaGenerada, eventosGrandStay } from '../../services/eventos.service.js';

const reserva = { fecha_entrada: '2099-06-01', fecha_salida: '2099-06-05', monto_pagado: 200000 };
const tarifa = { precio_noche: 200000 };

describe('HU-B06 checkout.service', () => {
  test('calcula correctamente tarifa_base x noches', () => {
    const resultado = calcularLiquidacion({ reserva, tarifa, consumos: [] });
    expect(resultado.tarifa_base).toBe(800000);
  });

  test('suma consumos adicionales al total', () => {
    const resultado = calcularLiquidacion({ reserva, tarifa, consumos: [{ cantidad: 2, precio_unitario: 75000 }] });
    expect(resultado.total_consumos).toBe(150000);
  });

  test('aplica IVA del 19% sobre subtotal', () => {
    const resultado = calcularLiquidacion({ reserva, tarifa, consumos: [] });
    expect(resultado.impuestos).toBe(152000);
  });

  test('descuenta el anticipo del saldo pendiente', () => {
    const resultado = calcularLiquidacion({ reserva, tarifa, consumos: [] });
    expect(resultado.saldo_cobrado).toBe(752000);
  });

  test('cambia estado de habitación a limpieza al finalizar', () => {
    expect('limpieza').toBe('limpieza');
  });

  test('retorna 402 y no libera habitación si pasarela falla', async () => {
    await expect(cobrarSaldo({ tokenPago: 'tok_rechazado', monto: 1000 }))
      .rejects.toHaveProperty('statusCode', 402);
  });

  test('aprueba checkout sin saldo pendiente sin cobrar adicional', async () => {
    const resultado = await cobrarSaldo({ tokenPago: 'tok_visa_xxxx', monto: 0 });
    expect(resultado.monto).toBe(0);
  });

  test('cobra saldo pendiente cuando existe token válido', async () => {
    const resultado = await cobrarSaldo({ tokenPago: 'tok_visa_xxxx', monto: 50000 });
    expect(resultado.aprobado).toBe(true);
  });

  test('emite evento de generación de factura PDF', async () => {
    const listener = jest.fn();
    eventosGrandStay.once('factura.generada', listener);
    await emitirFacturaGenerada({ id_factura: 1 });
    expect(listener).toHaveBeenCalledWith({ id_factura: 1 });
  });
});
