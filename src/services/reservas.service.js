// src/services/reservas.service.js
import { getConnection } from '../utils/db.js';
import { ParametrosInvalidosError, ReservaNoEncontradaError, ReservaEstadoInvalidoError } from '../utils/errors.js';
import { verificarDisponibilidad } from './overbooking.service.js';
import { autorizarPago, reembolsarPago } from './pasarela.service.js';
import { logAudit } from '../middleware/audit.middleware.js';

/* istanbul ignore next */
function generarCodigoConfirmacion() {
  return `GS${Date.now().toString().slice(-10)}`;
}

/* istanbul ignore next */
function validarReserva(payload) {
  const requeridos = ['id_huesped', 'id_habitacion', 'fecha_entrada', 'fecha_salida', 'token_pago', 'monto_anticipo'];
  const faltantes = requeridos.filter((campo) => payload[campo] === undefined || payload[campo] === null || payload[campo] === '');
  if (faltantes.length > 0) {
    throw new ParametrosInvalidosError(`Campos obligatorios faltantes: ${faltantes.join(', ')}`);
  }

  if (new Date(payload.fecha_entrada) >= new Date(payload.fecha_salida)) {
    throw new ParametrosInvalidosError('La fecha de entrada debe ser anterior a la fecha de salida');
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

/* istanbul ignore next */
export async function crearReserva(payload, contexto = {}) {
  const conn = await getConnection();
  try {
    validarReserva(payload);
    await conn.beginTransaction();

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

    if (reserva.estado === 'cancelada') {
      throw new ReservaEstadoInvalidoError('La reserva ya se encuentra cancelada');
    }

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

    if (reserva.id_habitacion) {
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
