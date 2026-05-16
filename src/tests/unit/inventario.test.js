import { calcularStockResultante, clasificarCriticidad } from '../../services/inventario.service.js';

describe('HU-B11 inventario.service', () => {
  test('descuenta stock correctamente', () => {
    expect(calcularStockResultante(20, 5)).toBe(15);
  });

  test('clasifica criticidad alta al llegar al umbral', () => {
    expect(clasificarCriticidad(10, 10)).toBe('alta');
  });

  test('clasifica criticidad critica bajo la mitad del umbral', () => {
    expect(clasificarCriticidad(4, 10)).toBe('critica');
  });

  test('clasifica stock normal sobre el umbral', () => {
    expect(clasificarCriticidad(11, 10)).toBe('normal');
  });

  test('rechaza consumo invalido y stock negativo', () => {
    let errorCantidad;
    let errorStock;
    try {
      calcularStockResultante(10, 0);
    } catch (error) {
      errorCantidad = error;
    }
    try {
      calcularStockResultante(2, 5);
    } catch (error) {
      errorStock = error;
    }
    expect(errorCantidad.statusCode).toBe(400);
    expect(errorStock.statusCode).toBe(400);
  });
});
