import { validarTransicionHabitacion } from '../../services/habitaciones.service.js';

describe('HU-B07 habitaciones.service', () => {
  test('permite transicion de ocupada a sucia para recepcion', () => {
    const resultado = validarTransicionHabitacion('ocupada', 'sucia', 'Recepcionista');
    expect(resultado).toEqual({ actual: 'ocupada', nuevo: 'sucia', bloqueaReservas: true });
  });

  test('permite transicion de sucia a limpieza para personal de limpieza', () => {
    const resultado = validarTransicionHabitacion('sucia', 'En Limpieza', 'PersonalLimpieza');
    expect(resultado).toEqual({ actual: 'sucia', nuevo: 'limpieza', bloqueaReservas: true });
  });

  test('rechaza transicion de limpieza ejecutada por recepcion', () => {
    let errorLanzado;
    try {
      validarTransicionHabitacion('sucia', 'limpieza', 'Recepcionista');
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
