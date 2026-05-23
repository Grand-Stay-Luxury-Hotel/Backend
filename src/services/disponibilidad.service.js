// src/services/disponibilidad.service.js
import { query } from '../utils/db.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

function validarFechas(fechaEntrada, fechaSalida) {
  const entrada = new Date(`${fechaEntrada}T00:00:00Z`);
  const salida = new Date(`${fechaSalida}T00:00:00Z`);
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);

  if (!fechaEntrada || !fechaSalida || Number.isNaN(entrada.getTime()) || Number.isNaN(salida.getTime())) {
    throw new ParametrosInvalidosError('fechaEntrada y fechaSalida son obligatorias y deben tener formato YYYY-MM-DD');
  }

  if (entrada >= salida) {
    throw new ParametrosInvalidosError('La fecha de entrada debe ser anterior a la fecha de salida');
  }

  if (entrada < hoy) {
    throw new ParametrosInvalidosError('La fecha de entrada no puede estar en el pasado');
  }
}

export async function consultarDisponibilidad({ fechaEntrada, fechaSalida, tipo = null, capacidad = null }) {
  try {
    validarFechas(fechaEntrada, fechaSalida);

    if (capacidad !== null && capacidad !== undefined && Number(capacidad) <= 0) {
      throw new ParametrosInvalidosError('La capacidad debe ser un número mayor a cero');
    }

    const habitaciones = await query(
      `
        SELECT
          h.id_habitacion,
          h.numero AS numero_habitacion,
          h.piso,
          th.nombre AS tipo_nombre,
          th.capacidad AS capacidad_max,
          h.estado
        FROM habitaciones h
        JOIN tipos_habitacion th ON h.id_tipo = th.id_tipo
        WHERE h.estado = 'disponible'
          AND h.activo = TRUE
          AND h.id_habitacion NOT IN (
            SELECT r.id_habitacion
            FROM reservas r
            WHERE r.estado NOT IN ('cancelada', 'no_show')
              AND r.id_habitacion IS NOT NULL
              AND r.fecha_entrada < :fechaSalida
              AND r.fecha_salida > :fechaEntrada
          )
          AND (:tipo IS NULL OR th.nombre = :tipo)
          AND (:capacidad IS NULL OR th.capacidad >= :capacidad)
        ORDER BY h.piso, h.numero
      `,
      {
        fechaEntrada,
        fechaSalida,
        tipo,
        capacidad: capacidad ? Number(capacidad) : null,
      },
    );

    return {
      habitaciones,
      data: habitaciones,
      total: habitaciones.length,
      mensaje: habitaciones.length === 0
        ? 'No hay habitaciones disponibles para las fechas seleccionadas'
        : undefined,
    };
  } catch (error) {
    throw error;
  }
}
