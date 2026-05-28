import { validarTransicionHabitacion } from '../../services/habitaciones.service.js';

describe('HU-B07 habitaciones.service', () => {
  test('permite transicion de ocupada a limpieza para recepcion', () => {
    const resultado = validarTransicionHabitacion('ocupada', 'limpieza', 'Recepcionista');
    expect(resultado).toEqual({ actual: 'ocupada', nuevo: 'limpieza', bloqueaReservas: true });
  });

  test('permite transicion de limpieza a disponible para personal de limpieza', () => {
    const resultado = validarTransicionHabitacion('limpieza', 'disponible', 'PersonalLimpieza');
    expect(resultado).toEqual({ actual: 'limpieza', nuevo: 'disponible', bloqueaReservas: false });
  });

  test('rechaza liberacion de limpieza ejecutada por recepcion', () => {
    let errorLanzado;
    try {
      validarTransicionHabitacion('limpieza', 'disponible', 'Recepcionista');
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(403);
  });

  test('rechaza transiciones no definidas', () => {
    expect(() => validarTransicionHabitacion('ocupada', 'disponible', 'Recepcionista'))
      .toThrow('Transicion no permitida');
  });

  test('rechaza estados desconocidos', () => {
    expect(() => validarTransicionHabitacion('sucia', 'disponible', 'Administrador'))
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
