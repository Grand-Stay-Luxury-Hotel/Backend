import { calcularTotalConsumo, validarTipoConsumo } from '../../services/consumos.service.js';

describe('HU-B08 consumos.service', () => {
  test('calcula total por cantidad y precio unitario', () => {
    expect(calcularTotalConsumo({ cantidad: 3, precio_unitario: 12000 })).toBe(36000);
  });

  test('normaliza tipo de consumo valido', () => {
    expect(validarTipoConsumo(' Restaurante ')).toBe('restaurante');
  });

  test('normaliza tipo de consumo con tilde', () => {
    expect(validarTipoConsumo('Lavandería')).toBe('lavanderia');
  });

  test('rechaza cantidades invalidas', () => {
    let errorLanzado;
    try {
      calcularTotalConsumo({ cantidad: 0, precio_unitario: 12000 });
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(400);
  });

  test('rechaza tipo de consumo invalido', () => {
    let errorLanzado;
    try {
      validarTipoConsumo('bar');
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(400);
  });
});
