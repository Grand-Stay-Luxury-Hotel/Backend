// src/services/reportes.service.js
import { query } from '../utils/db.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

export function validarPeriodo(mes, anio) {
  const mesNumero = Number(mes);
  const anioNumero = Number(anio);
  if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) {
    throw new ParametrosInvalidosError('mes debe estar entre 1 y 12');
  }
  if (!Number.isInteger(anioNumero) || anioNumero < 2000) {
    throw new ParametrosInvalidosError('anio no valido');
  }
  return { mes: mesNumero, anio: anioNumero };
}

export function calcularPorcentajeOcupacion(nochesOcupadas, habitaciones, diasMes) {
  const capacidadNoches = Number(habitaciones) * Number(diasMes);
  if (capacidadNoches <= 0) return 0;
  return Number(((Number(nochesOcupadas) / capacidadNoches) * 100).toFixed(2));
}

/* istanbul ignore next */
export async function obtenerReporteOcupacion({ mes, anio }) {
  const periodo = validarPeriodo(mes, anio);
  const fechaInicio = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}-01`;
  const diasMes = new Date(periodo.anio, periodo.mes, 0).getDate();
  const fechaFin = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}-${diasMes}`;

  const filas = await query(
    `
      SELECT
        th.nombre AS tipo_habitacion,
        COUNT(DISTINCT h.id_habitacion) AS habitaciones,
        COALESCE(SUM(DATEDIFF(LEAST(r.fecha_salida, :fechaFin), GREATEST(r.fecha_entrada, :fechaInicio))), 0) AS noches_ocupadas
      FROM tipos_habitacion th
      LEFT JOIN habitaciones h ON h.id_tipo = th.id_tipo AND h.activo = TRUE
      LEFT JOIN reservas r
        ON r.id_habitacion = h.id_habitacion
        AND r.estado IN ('confirmada', 'completada')
        AND r.fecha_entrada < :fechaFin
        AND r.fecha_salida > :fechaInicio
      GROUP BY th.id_tipo, th.nombre
      ORDER BY th.nombre
    `,
    { fechaInicio, fechaFin },
  );

  return {
    periodo,
    data: filas.map((fila) => ({
      ...fila,
      porcentaje_ocupacion: calcularPorcentajeOcupacion(fila.noches_ocupadas, fila.habitaciones, diasMes),
    })),
    exportable: ['json', 'pdf_trigger'],
  };
}

/* istanbul ignore next */
export async function obtenerReporteIngresos({ fechaInicio = null, fechaFin = null } = {}) {
  const ingresosHabitaciones = await query(
    `
      SELECT th.nombre AS tipo_habitacion, COALESCE(SUM(f.subtotal - f.impuestos), 0) AS ingresos
      FROM facturas f
      JOIN checkin ci ON ci.id_checkin = f.id_checkin
      JOIN reservas r ON r.id_reserva = ci.id_reserva
      JOIN tipos_habitacion th ON th.id_tipo = r.id_tipo_habitacion
      WHERE (:fechaInicio IS NULL OR f.fecha_emision >= :fechaInicio)
        AND (:fechaFin IS NULL OR f.fecha_emision <= :fechaFin)
      GROUP BY th.id_tipo, th.nombre
      ORDER BY ingresos DESC
    `,
    { fechaInicio, fechaFin },
  );

  const ingresosServicios = await query(
    `
      SELECT sa.categoria AS tipo_servicio, COALESCE(SUM(cs.subtotal), 0) AS ingresos
      FROM consumo_servicios cs
      JOIN servicios_adicionales sa ON sa.id_servicio = cs.id_servicio
      WHERE cs.estado <> 'cancelado'
        AND (:fechaInicio IS NULL OR cs.fecha >= :fechaInicio)
        AND (:fechaFin IS NULL OR cs.fecha <= :fechaFin)
      GROUP BY sa.categoria
      ORDER BY ingresos DESC
    `,
    { fechaInicio, fechaFin },
  );

  return {
    data: {
      habitaciones: ingresosHabitaciones,
      servicios_adicionales: ingresosServicios,
    },
    exportable: ['json', 'pdf_trigger'],
  };
}
