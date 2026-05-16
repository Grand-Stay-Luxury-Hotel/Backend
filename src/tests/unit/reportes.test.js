import { calcularPorcentajeOcupacion, validarPeriodo } from '../../services/reportes.service.js';

describe('HU-B12 reportes.service', () => {
  test('valida mes y anio', () => {
    expect(validarPeriodo('5', '2026')).toEqual({ mes: 5, anio: 2026 });
  });

  test('calcula porcentaje de ocupacion por tipo', () => {
    expect(calcularPorcentajeOcupacion(15, 2, 30)).toBe(25);
  });

  test('rechaza mes fuera de rango', () => {
    let errorLanzado;
    try {
      validarPeriodo(13, 2026);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(400);
  });

  test('rechaza anio invalido y evita division por cero', () => {
    let errorLanzado;
    try {
      validarPeriodo(1, 1999);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(400);
    expect(calcularPorcentajeOcupacion(10, 0, 30)).toBe(0);
  });
});
