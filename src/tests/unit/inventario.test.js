import { calcularStockResultante, clasificarCriticidad, crearAlertaStock } from '../../services/inventario.service.js';

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

  test('crea detalle de alerta pendiente con habitacion afectada', () => {
    const alerta = crearAlertaStock({
      insumo: { id_insumo: 6, nombre: 'Limpiavidrios', stock_minimo: 5 },
      stockResultante: 3,
      habitacionId: 101,
      criticidad: 'critica',
    });
    expect(alerta).toMatchObject({
      insumo_id: 6,
      habitacion_id: 101,
      stock_actual: 3,
      stock_minimo: 5,
      criticidad: 'critica',
      estado: 'pendiente',
    });
  });
});
