import {
  calcularPorcentajeOcupacion,
  construirRangoMensual,
  normalizarIngresoHabitacion,
  validarPeriodo,
  validarRangoFechas,
  validarVentanaMeses,
} from '../../services/reportes.service.js';

describe('HU-B12 reportes.service', () => {
  test('valida mes y anio', () => {
    expect(validarPeriodo('5', '2026')).toEqual({ mes: 5, anio: 2026 });
  });

  test('calcula porcentaje de ocupacion por tipo', () => {
    expect(calcularPorcentajeOcupacion(15, 2, 30)).toBe(25);
  });

  test('construye rango mensual con fecha fin exclusiva', () => {
    expect(construirRangoMensual({ mes: 5, anio: 2026 })).toMatchObject({
      periodo: { mes: 5, anio: 2026, meses: 1 },
      fechaInicio: '2026-05-01',
      fechaFinExclusiva: '2026-06-01',
      dias: 31,
    });
  });

  test('soporta ventana de hasta 12 meses', () => {
    expect(validarVentanaMeses('12')).toBe(12);
    expect(construirRangoMensual({ mes: 11, anio: 2026, meses: 3 })).toMatchObject({
      fechaInicio: '2026-11-01',
      fechaFinExclusiva: '2027-02-01',
      dias: 92,
    });
  });

  test('normaliza ingreso de habitacion sin restar impuestos', () => {
    expect(normalizarIngresoHabitacion({ subtotalAlojamiento: 450000, subtotalFactura: 535500, subtotalServicios: 0 })).toBe(450000);
    expect(normalizarIngresoHabitacion({ subtotalAlojamiento: 0, subtotalFactura: 1235000, subtotalServicios: 115000 })).toBe(1120000);
  });

  test('valida rangos de fecha para ingresos', () => {
    expect(validarRangoFechas('2026-05-01', '2026-06-01')).toEqual({
      fechaInicio: '2026-05-01',
      fechaFin: '2026-06-01',
    });
    expect(() => validarRangoFechas('2026-05-01', null)).toThrow('deben enviarse juntas');
    expect(() => validarRangoFechas('2026-99-01', '2026-06-01')).toThrow('formato YYYY-MM-DD');
    expect(() => validarRangoFechas('2026-06-01', '2026-05-01')).toThrow('debe ser anterior');
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

  test('rechaza ventana de meses fuera del limite', () => {
    let errorLanzado;
    try {
      validarVentanaMeses(13);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(400);
  });
});
