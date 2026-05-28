// src/tests/unit/huespedes.test.js
import { jest } from '@jest/globals';
import { query } from '../../utils/db.js';
import { buscarHuespedes } from '../../services/huespedes.service.js';

jest.mock('../../utils/db.js', () => ({
  query: jest.fn(),
}));

describe('huespedes.service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('busca huespedes por texto para selectores del frontend', async () => {
    query.mockResolvedValue([{ id_huesped: 1, nombre_completo: 'Sofia Torres' }]);

    const resultado = await buscarHuespedes({ buscar: 'Sofia', limite: 10 });

    expect(resultado.total).toBe(1);
    expect(query.mock.calls[0][1]).toMatchObject({ buscar: '%Sofia%', limite: 10 });
  });

  test('retorna mensaje si no hay resultados', async () => {
    query.mockResolvedValue([]);

    const resultado = await buscarHuespedes({ buscar: 'No existe' });

    expect(resultado.data).toEqual([]);
    expect(resultado.mensaje).toContain('No se encontraron');
  });

  test('rechaza limite invalido', async () => {
    await expect(buscarHuespedes({ limite: 101 }))
      .rejects.toHaveProperty('codigo', 'PARAMETROS_INVALIDOS');
  });
});
