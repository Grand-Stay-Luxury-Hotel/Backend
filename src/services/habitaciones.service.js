// src/services/habitaciones.service.js
import { getConnection } from '../utils/db.js';
import { AccesoDenegadoError, ParametrosInvalidosError, RecursoNoEncontradoError } from '../utils/errors.js';
import { logAudit } from '../middleware/audit.middleware.js';

const ESTADOS = {
  disponible: 'disponible',
  ocupada: 'ocupada',
  limpieza: 'limpieza',
  mantenimiento: 'mantenimiento',
  bloqueada: 'bloqueada',
};

const TRANSICIONES_VALIDAS = new Map([
  ['disponible', new Set(['ocupada', 'mantenimiento', 'bloqueada'])],
  ['ocupada', new Set(['limpieza'])],
  ['limpieza', new Set(['disponible', 'mantenimiento'])],
  ['mantenimiento', new Set(['disponible', 'limpieza'])],
  ['bloqueada', new Set(['disponible', 'mantenimiento'])],
]);

const ROLES_LIMPIEZA = new Set(['personallimpieza', 'limpieza']);

function normalizarRol(rol) {
  return String(rol ?? '').replace(/\s+/g, '').toLowerCase();
}

export function normalizarEstado(estado) {
  if (!estado || typeof estado !== 'string') return null;
  const normalizado = estado.trim().toLowerCase().replace('en ', '').replace('sucia', 'limpieza');
  return ESTADOS[normalizado] ?? null;
}

export function validarTransicionHabitacion(estadoActual, estadoNuevo, rol) {
  const actual = normalizarEstado(estadoActual);
  const nuevo = normalizarEstado(estadoNuevo);

  if (!actual || !nuevo) {
    throw new ParametrosInvalidosError('Estado de habitacion invalido');
  }

  if (!TRANSICIONES_VALIDAS.get(actual)?.has(nuevo)) {
    throw new ParametrosInvalidosError(`Transicion no permitida: ${actual} -> ${nuevo}`);
  }

  if (nuevo === 'limpieza' || (actual === 'limpieza' && nuevo === 'disponible')) {
    if (!ROLES_LIMPIEZA.has(normalizarRol(rol)) && rol !== 'Administrador') {
      throw new AccesoDenegadoError('Solo personal de limpieza puede ejecutar esta transicion');
    }
  }

  if ((nuevo === 'mantenimiento' || nuevo === 'bloqueada') && rol !== 'Recepcionista' && rol !== 'Administrador') {
    throw new AccesoDenegadoError('Solo recepcion puede marcar habitaciones en mantenimiento');
  }

  return { actual, nuevo, bloqueaReservas: nuevo === 'bloqueada' || nuevo === 'mantenimiento' || nuevo === 'limpieza' };
}

/* istanbul ignore next */
export async function cambiarEstadoHabitacion(idHabitacion, estadoSolicitado, contexto = {}) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [[habitacion]] = await conn.execute(
      'SELECT id_habitacion, estado FROM habitaciones WHERE id_habitacion = :idHabitacion FOR UPDATE',
      { idHabitacion },
    );

    if (!habitacion) {
      throw new RecursoNoEncontradoError('La habitacion solicitada no existe');
    }

    const transicion = validarTransicionHabitacion(habitacion.estado, estadoSolicitado, contexto.rol);
    const activo = transicion.bloqueaReservas ? 0 : 1;

    await conn.execute(
      'UPDATE habitaciones SET estado = :estado, activo = :activo WHERE id_habitacion = :idHabitacion',
      { estado: transicion.nuevo, activo, idHabitacion },
    );

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'UPDATE',
      tablaAfectada: 'habitaciones',
      idRegistro: Number(idHabitacion),
      valorAnterior: { estado: transicion.actual },
      valorNuevo: {
        accion_negocio: 'CAMBIO_ESTADO_HABITACION',
        estado: transicion.nuevo,
        observaciones: contexto.observaciones ?? null,
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return {
      id_habitacion: Number(idHabitacion),
      estado_anterior: transicion.actual,
      estado_nuevo: transicion.nuevo,
      bloqueada_para_reservas: transicion.bloqueaReservas,
      mensaje: 'Estado de habitacion actualizado exitosamente',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
