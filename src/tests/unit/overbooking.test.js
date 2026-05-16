// src/tests/unit/overbooking.test.js
import { verificarDisponibilidad } from '../../services/overbooking.service.js';

function crearConn(conflictos) {
  return {
    execute: jest.fn()
      .mockResolvedValueOnce([[{ id_habitacion: 1 }]])
      .mockResolvedValueOnce([conflictos]),
  };
}

describe('HU-B03 overbooking.service', () => {
  test('retorna solapamiento: false cuando no hay conflicto de fechas', async () => {
    const resultado = await verificarDisponibilidad(crearConn([]), 1, '2099-06-01', '2099-06-05');
    expect(resultado.solapamiento).toBe(false);
  });

  test('retorna error 409 cuando hay fechas solapadas', async () => {
    const conn = crearConn([{ id_reserva: 9, fecha_entrada: '2099-06-02', fecha_salida: '2099-06-06' }]);
    await expect(verificarDisponibilidad(conn, 1, '2099-06-01', '2099-06-05'))
      .rejects.toHaveProperty('statusCode', 409);
  });

  test('excluye correctamente la reserva indicada en excludeReservaId', async () => {
    const conn = crearConn([]);
    await verificarDisponibilidad(conn, 1, '2099-06-01', '2099-06-05', 7);
    expect(conn.execute.mock.calls[1][1].excludeReservaId).toBe(7);
  });

  test('detecta solapamiento parcial entrada dentro del rango', async () => {
    const conn = crearConn([{ id_reserva: 1, fecha_entrada: '2099-06-03', fecha_salida: '2099-06-08' }]);
    await expect(verificarDisponibilidad(conn, 1, '2099-06-01', '2099-06-05')).rejects.toHaveProperty('codigo', 'HABITACION_NO_DISPONIBLE');
  });

  test('detecta solapamiento parcial salida dentro del rango', async () => {
    const conn = crearConn([{ id_reserva: 1, fecha_entrada: '2099-05-29', fecha_salida: '2099-06-02' }]);
    await expect(verificarDisponibilidad(conn, 1, '2099-06-01', '2099-06-05')).rejects.toHaveProperty('codigo', 'HABITACION_NO_DISPONIBLE');
  });

  test('ignora reservas canceladas al verificar solapamiento', async () => {
    const conn = crearConn([]);
    await verificarDisponibilidad(conn, 1, '2099-06-01', '2099-06-05');
    expect(conn.execute.mock.calls[1][0]).toContain("estado NOT IN ('cancelada', 'no_show')");
  });
});
