// src/services/habitaciones.service.js
import { getConnection, query } from '../utils/db.js';
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
const ROLES_RECEPCION = new Set(['recepcionista']);
const ROLES_ADMIN = new Set(['administrador', 'admin']);
const ROLES_TECNICO = new Set(['serviciotecnico', 'serviciodetecnico']);

function normalizarRol(rol) {
  const llave = String(rol ?? '').replace(/\s+/g, '').toLowerCase();
  const alias = new Map([
    ['personaldelimpieza', 'personallimpieza'],
    ['limpieza', 'personallimpieza'],
    ['admin', 'administrador'],
    ['serviciotecnico', 'serviciotecnico'],
    ['serviciotécnico', 'serviciotecnico'],
    ['serviciodetecnico', 'serviciotecnico'],
    ['serviciodetécnico', 'serviciotecnico'],
  ]);
  return alias.get(llave) ?? llave;
}

export function normalizarEstado(estado) {
  if (!estado || typeof estado !== 'string') return null;
  const normalizado = estado.trim().toLowerCase().replace('en ', '');
  return ESTADOS[normalizado] ?? null;
}

function normalizarLimite(limite = 50) {
  const valor = Number(limite);
  if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
    throw new ParametrosInvalidosError('El limite debe ser un numero entero entre 1 y 100');
  }
  return valor;
}

function normalizarBooleano(valor) {
  return ['true', '1', 'si', 'sí'].includes(String(valor ?? '').trim().toLowerCase());
}

export async function listarHabitaciones({ buscar = '', estado = null, conReservaActiva = false, limite = 50 } = {}) {
  try {
    const estadoNormalizado = estado ? normalizarEstado(estado) : null;
    if (estado && !estadoNormalizado) {
      throw new ParametrosInvalidosError('Estado de habitacion invalido');
    }

    const patronBusqueda = String(buscar ?? '').trim();
    const limiteNormalizado = normalizarLimite(limite);
    const habitaciones = await query(
      `
        SELECT
          h.id_habitacion,
          h.numero_habitacion,
          h.piso,
          h.estado,
          h.activo,
          th.id_tipo,
          th.nombre AS tipo_nombre,
          th.capacidad_max,
          r.id_reserva AS id_reserva_activa,
          r.codigo_confirmacion,
          r.estado AS estado_reserva,
          CONCAT(hu.nombres, ' ', hu.apellidos) AS huesped_nombre
        FROM habitaciones h
        JOIN tipos_habitacion th ON th.id_tipo = h.id_tipo
        LEFT JOIN reservas r
          ON r.id_habitacion = h.id_habitacion
          AND r.estado = 'en_curso'
        LEFT JOIN huespedes hu ON hu.id_huesped = r.id_huesped
        WHERE
          (:estado IS NULL OR h.estado = :estado)
          AND (:buscar = '' OR h.numero_habitacion LIKE :buscarLike OR th.nombre LIKE :buscarLike)
          AND (:conReservaActiva = FALSE OR r.id_reserva IS NOT NULL)
        ORDER BY h.piso, h.numero_habitacion
        LIMIT ${limiteNormalizado}
      `,
      {
        estado: estadoNormalizado,
        buscar: patronBusqueda,
        buscarLike: `%${patronBusqueda}%`,
        conReservaActiva: normalizarBooleano(conReservaActiva),
        limite: limiteNormalizado,
      },
    );

    return {
      data: habitaciones,
      total: habitaciones.length,
      mensaje: habitaciones.length === 0 ? 'No se encontraron habitaciones con los criterios indicados' : undefined,
    };
  } catch (error) {
    throw error;
  }
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

  if (actual === 'limpieza' && nuevo === 'disponible') {
    const rolNormalizado = normalizarRol(rol);
    if (!ROLES_LIMPIEZA.has(rolNormalizado) && !ROLES_ADMIN.has(rolNormalizado)) {
      throw new AccesoDenegadoError('Solo personal de limpieza puede ejecutar esta transicion');
    }
  }

  const rolNormalizado = normalizarRol(rol);
  if (nuevo === 'bloqueada' && !ROLES_RECEPCION.has(rolNormalizado) && !ROLES_ADMIN.has(rolNormalizado)) {
    throw new AccesoDenegadoError('Solo recepcion puede bloquear habitaciones');
  }

  if (nuevo === 'mantenimiento' && !ROLES_RECEPCION.has(rolNormalizado) && !ROLES_ADMIN.has(rolNormalizado) && !ROLES_TECNICO.has(rolNormalizado)) {
    throw new AccesoDenegadoError('Solo recepcion puede marcar habitaciones en mantenimiento');
  }

  if (actual === 'mantenimiento' && !ROLES_RECEPCION.has(rolNormalizado) && !ROLES_ADMIN.has(rolNormalizado) && !ROLES_TECNICO.has(rolNormalizado)) {
    throw new AccesoDenegadoError('Solo recepcion o servicio tecnico puede finalizar mantenimiento');
  }

  return { actual, nuevo, bloqueaReservas: nuevo === 'bloqueada' || nuevo === 'mantenimiento' || nuevo === 'limpieza' };
}

export async function cambiarEstadoHabitacionEnTransaccion(conn, idHabitacion, estadoSolicitado, contexto = {}) {
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
      accion_negocio: contexto.accionNegocio ?? 'CAMBIO_ESTADO_HABITACION',
      estado: transicion.nuevo,
      observaciones: contexto.observaciones ?? null,
    },
    ip: contexto.ip ?? null,
    userAgent: contexto.userAgent ?? null,
  });

  return {
    id_habitacion: Number(idHabitacion),
    estado_anterior: transicion.actual,
    estado_nuevo: transicion.nuevo,
    bloqueada_para_reservas: transicion.bloqueaReservas,
    mensaje: 'Estado de habitacion actualizado exitosamente',
  };
}

/* istanbul ignore next */
export async function cambiarEstadoHabitacion(idHabitacion, estadoSolicitado, contexto = {}) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const resultado = await cambiarEstadoHabitacionEnTransaccion(conn, idHabitacion, estadoSolicitado, contexto);
    await conn.commit();
    return resultado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
