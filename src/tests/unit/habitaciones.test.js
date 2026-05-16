import { validarTransicionHabitacion } from '../../services/habitaciones.service.js';

describe('HU-B07 habitaciones.service', () => {
  test('permite transicion de ocupada a limpieza para personal de limpieza', () => {
    const resultado = validarTransicionHabitacion('ocupada', 'limpieza', 'PersonalLimpieza');
    expect(resultado).toEqual({ actual: 'ocupada', nuevo: 'limpieza', bloqueaReservas: true });
  });

  test('rechaza transiciones no definidas', () => {
    expect(() => validarTransicionHabitacion('ocupada', 'disponible', 'Recepcionista'))
      .toThrow('Transicion no permitida');
  });

  test('rechaza estados desconocidos', () => {
    expect(() => validarTransicionHabitacion('fuera_servicio', 'disponible', 'Administrador'))
      .toThrow('Estado de habitacion invalido');
  });

  test('solo recepcion o administrador marcan mantenimiento', () => {
    let errorLanzado;
    try {
      validarTransicionHabitacion('disponible', 'mantenimiento', 'Personal de Limpieza');
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(403);
  });

  test('recepcion puede marcar mantenimiento', () => {
    const resultado = validarTransicionHabitacion('disponible', 'mantenimiento', 'Recepcionista');
    expect(resultado.bloqueaReservas).toBe(true);
  });
});
