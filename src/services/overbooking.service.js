// src/services/overbooking.service.js
import { OverbookingError } from '../utils/errors.js';
import { logAudit } from '../middleware/audit.middleware.js';

export async function verificarDisponibilidad(
  conn,
  idHabitacion,
  fechaEntrada,
  fechaSalida,
  excludeReservaId = null,
  auditContext = {},
) {
  try {
    await conn.execute(
      'SELECT id_habitacion FROM habitaciones WHERE id_habitacion = :idHabitacion FOR UPDATE',
      { idHabitacion },
    );

    const [conflictos] = await conn.execute(
      `
        SELECT id_reserva, id_habitacion, fecha_entrada, fecha_salida, estado
        FROM reservas
        WHERE id_habitacion = :idHabitacion
          AND estado NOT IN ('cancelada', 'no_show')
          AND fecha_entrada < :fechaSalida
          AND fecha_salida > :fechaEntrada
          AND (:excludeReservaId IS NULL OR id_reserva <> :excludeReservaId)
        FOR UPDATE
      `,
      { idHabitacion, fechaEntrada, fechaSalida, excludeReservaId },
    );

    if (conflictos.length > 0) {
      await logAudit({
        conn,
        userId: auditContext.userId ?? null,
        accion: 'INSERT',
        tablaAfectada: 'log_auditoria',
        valorNuevo: {
          accion_negocio: 'INTENTO_OVERBOOKING',
          id_habitacion: idHabitacion,
          fechas_solicitadas: { fecha_entrada: fechaEntrada, fecha_salida: fechaSalida },
          conflictos,
        },
        ip: auditContext.ip ?? null,
        userAgent: auditContext.userAgent ?? null,
      });

      const detalle = conflictos
        .map((reserva) => `Conflicto con reserva #${reserva.id_reserva} del ${reserva.fecha_entrada} al ${reserva.fecha_salida}`)
        .join('; ');
      throw new OverbookingError('La habitación seleccionada no está disponible en las fechas indicadas', detalle);
    }

    return { solapamiento: false, conflictos: [] };
  } catch (error) {
    throw error;
  }
}
