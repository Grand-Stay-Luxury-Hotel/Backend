// src/tests/unit/disponibilidad.test.js
import { jest } from '@jest/globals';
import { query } from '../../utils/db.js';
import { consultarDisponibilidad } from '../../services/disponibilidad.service.js';

jest.mock('../../utils/db.js', () => ({
  query: jest.fn(),
}));

describe('HU-B01 disponibilidad.service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('retorna lista de habitaciones disponibles para fechas válidas', async () => {
    query.mockResolvedValue([{ id_habitacion: 1, numero_habitacion: '101' }]);
    const resultado = await consultarDisponibilidad({ fechaEntrada: '2099-06-01', fechaSalida: '2099-06-05' });
    expect(resultado.total).toBe(1);
  });

  test('retorna lista vacía si no hay disponibilidad', async () => {
    query.mockResolvedValue([]);
    const resultado = await consultarDisponibilidad({ fechaEntrada: '2099-06-01', fechaSalida: '2099-06-05' });
    expect(resultado.data).toEqual([]);
    expect(resultado.mensaje).toContain('No hay habitaciones disponibles');
  });

  test('filtra correctamente por tipo de habitación', async () => {
    query.mockResolvedValue([]);
    await consultarDisponibilidad({ fechaEntrada: '2099-06-01', fechaSalida: '2099-06-05', tipo: 'Deluxe' });
    expect(query.mock.calls[0][1].tipo).toBe('Deluxe');
  });

  test('filtra correctamente por capacidad mínima', async () => {
    query.mockResolvedValue([]);
    await consultarDisponibilidad({ fechaEntrada: '2099-06-01', fechaSalida: '2099-06-05', capacidad: 3 });
    expect(query.mock.calls[0][1].capacidad).toBe(3);
  });

  test('lanza error de validación si fechaEntrada >= fechaSalida', async () => {
    await expect(consultarDisponibilidad({ fechaEntrada: '2099-06-05', fechaSalida: '2099-06-01' }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });

  test('lanza error si fechaEntrada está en el pasado', async () => {
    await expect(consultarDisponibilidad({ fechaEntrada: '2020-01-01', fechaSalida: '2020-01-02' }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });

  test('lanza error si parámetros requeridos están ausentes', async () => {
    await expect(consultarDisponibilidad({ fechaEntrada: '2099-01-01' }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });
});
