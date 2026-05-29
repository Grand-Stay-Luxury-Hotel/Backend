// src/services/reservas.service.js
import { getConnection, query } from '../utils/db.js';
import { AccesoDenegadoError, ParametrosInvalidosError, ReservaNoEncontradaError, ReservaEstadoInvalidoError } from '../utils/errors.js';
import { verificarDisponibilidad } from './overbooking.service.js';
import { autorizarPago, reembolsarPago } from './pasarela.service.js';
import { logAudit } from '../middleware/audit.middleware.js';

const ESTADOS_RESERVA_CANCELABLES = new Set(['pendiente', 'confirmada']);

/* istanbul ignore next */
function generarCodigoConfirmacion() {
  return `GS${Date.now().toString().slice(-10)}`;
}

/* istanbul ignore next */
export function validarReserva(payload) {
  const requeridos = ['id_huesped', 'id_habitacion', 'fecha_entrada', 'fecha_salida', 'token_pago', 'monto_anticipo'];
  const faltantes = requeridos.filter((campo) => payload[campo] === undefined || payload[campo] === null || payload[campo] === '');
  if (faltantes.length > 0) {
    throw new ParametrosInvalidosError(`Campos obligatorios faltantes: ${faltantes.join(', ')}`);
  }

  const entrada = new Date(`${payload.fecha_entrada}T00:00:00Z`);
  const salida = new Date(`${payload.fecha_salida}T00:00:00Z`);
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);

  if (Number.isNaN(entrada.getTime()) || Number.isNaN(salida.getTime())) {
    throw new ParametrosInvalidosError('Las fechas deben tener formato YYYY-MM-DD');
  }

  if (entrada >= salida) {
    throw new ParametrosInvalidosError('La fecha de entrada debe ser anterior a la fecha de salida');
  }

  if (entrada < hoy) {
    throw new ParametrosInvalidosError('La fecha de entrada no puede estar en el pasado');
  }

  if (Number(payload.monto_anticipo) < 0) {
    throw new ParametrosInvalidosError('El monto de anticipo no puede ser negativo');
  }
}

export function calcularPenalizacion(fechaEntrada, montoPagado, fechaActual = new Date()) {
  const entrada = new Date(`${fechaEntrada}T00:00:00Z`);
  const actual = fechaActual instanceof Date
    ? new Date(Date.UTC(fechaActual.getUTCFullYear(), fechaActual.getUTCMonth(), fechaActual.getUTCDate()))
    : new Date(`${fechaActual}T00:00:00Z`);
  const dias = Math.ceil((entrada - actual) / (1000 * 60 * 60 * 24));

  let porcentaje = 100;
  if (dias > 7) porcentaje = 0;
  if (dias >= 3 && dias <= 7) porcentaje = 30;
  if (dias > 0 && dias < 3) porcentaje = 50;
  if (dias <= 0) porcentaje = 100;

  const montoPenalizacion = Number(((montoPagado * porcentaje) / 100).toFixed(2));
  const montoReembolso = Number((montoPagado - montoPenalizacion).toFixed(2));
  return { porcentaje, montoPenalizacion, montoReembolso };
}

export function validarEstadoReservaCancelable(estado) {
  if (!ESTADOS_RESERVA_CANCELABLES.has(estado)) {
    throw new ReservaEstadoInvalidoError(
      `Solo se pueden cancelar reservas en estado ${Array.from(ESTADOS_RESERVA_CANCELABLES).join(' o ')}`,
    );
  }
}

function normalizarLimite(limite = 50) {
  const valor = Number(limite);
  if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
    throw new ParametrosInvalidosError('El limite debe ser un numero entero entre 1 y 100');
  }
  return valor;
}

function estadosPorOperacion(operacion) {
  const operacionNormalizada = String(operacion ?? '').trim().toLowerCase();
  if (operacionNormalizada === 'checkin') return ['confirmada'];
  if (operacionNormalizada === 'checkout') return ['en_curso'];
  if (operacionNormalizada === 'cancelacion') return Array.from(ESTADOS_RESERVA_CANCELABLES);
  return null;
}

export async function listarReservas({ buscar = '', estado = null, operacion = null, limite = 50 } = {}) {
  try {
    const estadosOperacion = estadosPorOperacion(operacion);
    const estados = estadosOperacion ?? (estado ? [String(estado).trim()] : null);
    const patronBusqueda = String(buscar ?? '').trim();
    const limiteNormalizado = normalizarLimite(limite);

    const reservas = await query(
      `
        SELECT
          r.id_reserva,
          r.codigo_confirmacion,
          r.estado,
          r.fecha_entrada,
          r.fecha_salida,
          r.monto_pagado,
          r.canal_reserva,
          r.id_huesped,
          CONCAT(hu.nombres, ' ', hu.apellidos) AS huesped_nombre,
          hu.email AS huesped_email,
          hu.num_documento AS huesped_documento,
          r.id_habitacion,
          h.numero_habitacion,
          th.nombre AS tipo_habitacion,
          ci.id_checkin
        FROM reservas r
        JOIN huespedes hu ON hu.id_huesped = r.id_huesped
        JOIN habitaciones h ON h.id_habitacion = r.id_habitacion
        JOIN tipos_habitacion th ON th.id_tipo = r.id_tipo_habitacion
        LEFT JOIN checkin ci ON ci.id_reserva = r.id_reserva
        WHERE
          (:estadosCsv IS NULL OR FIND_IN_SET(r.estado, :estadosCsv) > 0)
          AND (
            :buscar = ''
            OR r.codigo_confirmacion LIKE :buscarLike
            OR CAST(r.id_reserva AS CHAR) = :buscarExacto
            OR h.numero_habitacion LIKE :buscarLike
            OR hu.nombres LIKE :buscarLike
            OR hu.apellidos LIKE :buscarLike
            OR CONCAT(hu.nombres, ' ', hu.apellidos) LIKE :buscarLike
            OR hu.email LIKE :buscarLike
            OR hu.num_documento LIKE :buscarLike
          )
        ORDER BY r.fecha_entrada DESC, r.id_reserva DESC
        LIMIT ${limiteNormalizado}
      `,
      {
        estadosCsv: estados ? estados.join(',') : null,
        buscar: patronBusqueda,
        buscarLike: `%${patronBusqueda}%`,
        buscarExacto: patronBusqueda,
        limite: limiteNormalizado,
      },
    );

    return {
      data: reservas,
      total: reservas.length,
      filtros: {
        buscar: patronBusqueda || null,
        estado: estado || null,
        operacion: operacion || null,
      },
      mensaje: reservas.length === 0 ? 'No se encontraron reservas con los criterios indicados' : undefined,
    };
  } catch (error) {
    throw error;
  }
}

export async function listarReservasHuesped(idHuesped, { estado = null, limite = 50 } = {}) {
  try {
    const huespedId = Number(idHuesped);
    if (!Number.isInteger(huespedId) || huespedId <= 0) {
      throw new AccesoDenegadoError('No hay huesped asociado al usuario autenticado');
    }
    const limiteNormalizado = normalizarLimite(limite);

    const reservas = await query(
      `
        SELECT
          r.id_reserva,
          r.codigo_confirmacion,
          r.codigo_confirmacion AS codigo_reserva,
          r.estado,
          r.fecha_entrada,
          r.fecha_salida,
          r.monto_pagado,
          r.monto_pagado AS monto_anticipo,
          r.canal_reserva,
          r.id_huesped,
          (r.num_adultos + r.num_ninos) AS numero_huespedes,
          CONCAT(hu.nombres, ' ', hu.apellidos) AS huesped_nombre,
          hu.email AS huesped_email,
          hu.num_documento AS huesped_documento,
          r.id_habitacion,
          h.numero_habitacion,
          th.nombre AS tipo_habitacion,
          ci.id_checkin
        FROM reservas r
        JOIN huespedes hu ON hu.id_huesped = r.id_huesped
        JOIN habitaciones h ON h.id_habitacion = r.id_habitacion
        JOIN tipos_habitacion th ON th.id_tipo = r.id_tipo_habitacion
        LEFT JOIN checkin ci ON ci.id_reserva = r.id_reserva
        WHERE r.id_huesped = :idHuesped
          AND (:estado IS NULL OR r.estado = :estado)
        ORDER BY r.fecha_entrada DESC, r.id_reserva DESC
        LIMIT ${limiteNormalizado}
      `,
      {
        idHuesped: huespedId,
        estado: estado ? String(estado).trim() : null,
        limite: limiteNormalizado,
      },
    );

    return {
      data: reservas,
      total: reservas.length,
      mensaje: reservas.length === 0 ? 'No tienes reservas registradas' : undefined,
    };
  } catch (error) {
    throw error;
  }
}

/* istanbul ignore next */
export async function crearReserva(payload, contexto = {}) {
  const conn = await getConnection();
  try {
    if (contexto.rol === 'Huesped') {
      payload.id_huesped = contexto.idHuesped;
    }

    validarReserva(payload);

    await conn.beginTransaction();

    const [[huesped]] = await conn.execute(
      'SELECT id_huesped FROM huespedes WHERE id_huesped = :idHuesped LIMIT 1 FOR UPDATE',
      { idHuesped: payload.id_huesped },
    );
    if (!huesped) {
      throw new ParametrosInvalidosError('El huésped seleccionado no existe');
    }

    const [[habitacion]] = await conn.execute(
      `
        SELECT h.id_habitacion, h.id_tipo, h.estado
        FROM habitaciones h
        WHERE h.id_habitacion = :idHabitacion AND h.activo = TRUE
        FOR UPDATE
      `,
      { idHabitacion: payload.id_habitacion },
    );

    if (!habitacion || habitacion.estado !== 'disponible') {
      throw new ParametrosInvalidosError('La habitación no existe o no está disponible');
    }

    await verificarDisponibilidad(conn, payload.id_habitacion, payload.fecha_entrada, payload.fecha_salida, null, contexto);
    const pago = await autorizarPago({ tokenPago: payload.token_pago, monto: Number(payload.monto_anticipo) });

    const [resultadoReserva] = await conn.execute(
      `
        INSERT INTO reservas
          (codigo_confirmacion, id_huesped, id_recepcionista, id_tipo_habitacion, id_habitacion,
           fecha_entrada, fecha_salida, estado, canal_reserva, monto_pagado, observaciones)
        VALUES
          (:codigo, :idHuesped, :idRecepcionista, :idTipoHabitacion, :idHabitacion,
           :fechaEntrada, :fechaSalida, 'confirmada', :canalReserva, :montoPagado, :observaciones)
      `,
      {
        codigo: generarCodigoConfirmacion(),
        idHuesped: payload.id_huesped,
        idRecepcionista: contexto.idRecepcionista ?? null,
        idTipoHabitacion: habitacion.id_tipo,
        idHabitacion: payload.id_habitacion,
        fechaEntrada: payload.fecha_entrada,
        fechaSalida: payload.fecha_salida,
        canalReserva: contexto.rol === 'Huesped' ? 'web' : 'presencial',
        montoPagado: Number(payload.monto_anticipo),
        observaciones: payload.observaciones ?? null,
      },
    );

    await conn.execute(
      `
        INSERT INTO tokens_pago
          (id_reserva, token, proveedor, monto_autorizado, referencia_ext)
        VALUES
          (:idReserva, :token, :proveedor, :monto, :referencia)
      `,
      {
        idReserva: resultadoReserva.insertId,
        token: payload.token_pago,
        proveedor: pago.proveedor,
        monto: Number(payload.monto_anticipo),
        referencia: pago.referencia,
      },
    );

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'INSERT',
      tablaAfectada: 'tokens_pago',
      idRegistro: resultadoReserva.insertId,
      valorNuevo: {
        accion_negocio: 'COBRO_ANTICIPO_RESERVA',
        id_reserva: resultadoReserva.insertId,
        monto: Number(payload.monto_anticipo),
        referencia: pago.referencia,
        proveedor: pago.proveedor,
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'INSERT',
      tablaAfectada: 'reservas',
      idRegistro: resultadoReserva.insertId,
      valorNuevo: { accion_negocio: 'RESERVA_CREADA', id_reserva: resultadoReserva.insertId },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return {
      id_reserva: resultadoReserva.insertId,
      estado: 'confirmada',
      mensaje: 'Reserva creada exitosamente',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/* istanbul ignore next */
export async function cancelarReserva(idReserva, contexto = {}) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [[reserva]] = await conn.execute(
      `
        SELECT r.*, tp.token
        FROM reservas r
        LEFT JOIN tokens_pago tp ON tp.id_reserva = r.id_reserva AND tp.vigente = TRUE
        WHERE r.id_reserva = :idReserva
        FOR UPDATE
      `,
      { idReserva },
    );

    if (!reserva) {
      throw new ReservaNoEncontradaError();
    }

    validarEstadoReservaCancelable(reserva.estado);

    const penalizacion = calcularPenalizacion(reserva.fecha_entrada, Number(reserva.monto_pagado));
    if (penalizacion.montoReembolso > 0) {
      const reembolso = await reembolsarPago({ tokenPago: reserva.token, monto: penalizacion.montoReembolso });
      await logAudit({
        conn,
        userId: contexto.userId ?? null,
        accion: 'INSERT',
        tablaAfectada: 'tokens_pago',
        idRegistro: Number(idReserva),
        valorNuevo: {
          accion_negocio: 'REEMBOLSO_CANCELACION_RESERVA',
          id_reserva: Number(idReserva),
          monto: penalizacion.montoReembolso,
          referencia: reembolso.referencia,
          proveedor: reembolso.proveedor,
        },
        ip: contexto.ip ?? null,
        userAgent: contexto.userAgent ?? null,
      });
    }

    await conn.execute(
      "UPDATE reservas SET estado = 'cancelada' WHERE id_reserva = :idReserva",
      { idReserva },
    );

    if (reserva.id_habitacion && reserva.estado === 'confirmada') {
      await conn.execute(
        "UPDATE habitaciones SET estado = 'disponible' WHERE id_habitacion = :idHabitacion",
        { idHabitacion: reserva.id_habitacion },
      );
    }

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'UPDATE',
      tablaAfectada: 'reservas',
      idRegistro: Number(idReserva),
      valorAnterior: { estado: reserva.estado },
      valorNuevo: {
        accion_negocio: 'CANCELACION_RESERVA',
        estado: 'cancelada',
        monto_penalizacion: penalizacion.montoPenalizacion,
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return {
      mensaje: 'Reserva cancelada exitosamente',
      penalizacion_aplicada: penalizacion.porcentaje,
      monto_reembolso: penalizacion.montoReembolso,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
