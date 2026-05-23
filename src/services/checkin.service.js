// src/services/checkin.service.js
import crypto from 'crypto';
import { getConnection } from '../utils/db.js';
import { ReservaEstadoInvalidoError, ReservaNoEncontradaError } from '../utils/errors.js';
import { logAudit } from '../middleware/audit.middleware.js';
import { emitirCodigoAcceso } from './eventos.service.js';

function generarCodigoAcceso() {
  return `GS-${crypto.randomInt(1000, 9999)}`;
}

export async function registrarCheckin(idReserva, contexto = {}) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [[reserva]] = await conn.execute(
      `
        SELECT id_reserva, id_habitacion, estado
        FROM reservas
        WHERE id_reserva = :idReserva
        FOR UPDATE
      `,
      { idReserva },
    );

    if (!reserva) {
      throw new ReservaNoEncontradaError();
    }

    if (reserva.estado !== 'confirmada') {
      throw new ReservaEstadoInvalidoError('Solo se puede registrar check-in para reservas confirmadas');
    }

    const codigoAcceso = generarCodigoAcceso();
    const [resultado] = await conn.execute(
      `
        INSERT INTO checkin
          (id_reserva, id_recepcionista, id_habitacion, codigo_acceso, documento_verificado, observaciones)
        VALUES
          (:idReserva, :idRecepcionista, :idHabitacion, :codigoAcceso, :documentoVerificado, :observaciones)
      `,
      {
        idReserva,
        idRecepcionista: contexto.idRecepcionista,
        idHabitacion: reserva.id_habitacion,
        codigoAcceso,
        documentoVerificado: contexto.documentoVerificado ?? true,
        observaciones: contexto.observaciones ?? null,
      },
    );

    await conn.execute(
      "UPDATE habitaciones SET estado = 'ocupada' WHERE id_habitacion = :idHabitacion",
      { idHabitacion: reserva.id_habitacion },
    );

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'INSERT',
      tablaAfectada: 'checkin',
      idRegistro: resultado.insertId,
      valorNuevo: { accion_negocio: 'CHECKIN', id_reserva: Number(idReserva), codigo_acceso: codigoAcceso },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    await emitirCodigoAcceso({ id_reserva: Number(idReserva), codigo_acceso: codigoAcceso });

    return {
      id_checkin: resultado.insertId,
      id_reserva: Number(idReserva),
      hora_entrada: new Date().toISOString(),
      codigo_acceso: codigoAcceso,
      mensaje: 'Check-in registrado exitosamente',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
