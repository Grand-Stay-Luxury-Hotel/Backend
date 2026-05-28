// src/tests/unit/busquedas-operativas.test.js
import { jest } from '@jest/globals';
import { query } from '../../utils/db.js';
import { listarHabitaciones } from '../../services/habitaciones.service.js';
import { listarReservas } from '../../services/reservas.service.js';

jest.mock('../../utils/db.js', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

describe('busquedas operativas para frontend', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('lista habitaciones filtrando por numero y estado', async () => {
    query.mockResolvedValue([{ id_habitacion: 1, numero_habitacion: '101' }]);

    const resultado = await listarHabitaciones({ buscar: '101', estado: 'disponible', limite: 5 });

    expect(resultado.total).toBe(1);
    expect(query.mock.calls[0][1]).toMatchObject({
      estado: 'disponible',
      buscar: '101',
      buscarLike: '%101%',
      limite: 5,
    });
  });

  test('lista habitaciones ocupadas con reserva activa', async () => {
    query.mockResolvedValue([]);

    await listarHabitaciones({ estado: 'ocupada', conReservaActiva: 'true' });

    expect(query.mock.calls[0][1].conReservaActiva).toBe(true);
  });

  test('rechaza estado de habitacion invalido', async () => {
    await expect(listarHabitaciones({ estado: 'sucia' }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });

  test('lista reservas por operacion de checkin', async () => {
    query.mockResolvedValue([{ id_reserva: 42, codigo_confirmacion: 'GS-42' }]);

    const resultado = await listarReservas({ operacion: 'checkin', buscar: 'Sofia', limite: 10 });

    expect(resultado.total).toBe(1);
    expect(query.mock.calls[0][1]).toMatchObject({
      estadosCsv: 'confirmada',
      buscar: 'Sofia',
      buscarLike: '%Sofia%',
      limite: 10,
    });
  });

  test('lista reservas por operacion de checkout', async () => {
    query.mockResolvedValue([]);

    await listarReservas({ operacion: 'checkout' });

    expect(query.mock.calls[0][1].estadosCsv).toBe('en_curso');
  });

  test('rechaza limite invalido en reservas', async () => {
    await expect(listarReservas({ limite: 0 }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });
});
