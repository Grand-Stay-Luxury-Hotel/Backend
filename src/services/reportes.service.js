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

export function validarVentanaMeses(meses = 1) {
  const mesesNumero = Number(meses);
  if (!Number.isInteger(mesesNumero) || mesesNumero < 1 || mesesNumero > 12) {
    throw new ParametrosInvalidosError('meses debe estar entre 1 y 12');
  }
  return mesesNumero;
}

export function construirRangoMensual({ mes, anio, meses = 1 }) {
  const periodo = validarPeriodo(mes, anio);
  const ventanaMeses = validarVentanaMeses(meses);
  const inicio = new Date(Date.UTC(periodo.anio, periodo.mes - 1, 1));
  const finExclusivo = new Date(Date.UTC(periodo.anio, periodo.mes - 1 + ventanaMeses, 1));
  const dias = Math.round((finExclusivo - inicio) / (1000 * 60 * 60 * 24));

  return {
    periodo: { ...periodo, meses: ventanaMeses },
    fechaInicio: inicio.toISOString().slice(0, 10),
    fechaFinExclusiva: finExclusivo.toISOString().slice(0, 10),
    dias,
  };
}

export function normalizarIngresoHabitacion({ subtotalAlojamiento = 0, subtotalFactura = 0, subtotalServicios = 0 }) {
  const alojamiento = Number(subtotalAlojamiento);
  if (alojamiento > 0) return Number(alojamiento.toFixed(2));
  return Number(Math.max(Number(subtotalFactura) - Number(subtotalServicios), 0).toFixed(2));
}

function esFechaIso(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function validarRangoFechas(fechaInicio = null, fechaFin = null) {
  if (!fechaInicio && !fechaFin) {
    return { fechaInicio: null, fechaFin: null };
  }

  if (!fechaInicio || !fechaFin) {
    throw new ParametrosInvalidosError('fechaInicio y fechaFin deben enviarse juntas');
  }

  if (!esFechaIso(fechaInicio) || !esFechaIso(fechaFin)) {
    throw new ParametrosInvalidosError('fechaInicio y fechaFin deben tener formato YYYY-MM-DD');
  }

  if (new Date(`${fechaInicio}T00:00:00Z`) >= new Date(`${fechaFin}T00:00:00Z`)) {
    throw new ParametrosInvalidosError('fechaInicio debe ser anterior a fechaFin');
  }

  return { fechaInicio, fechaFin };
}

/* istanbul ignore next */
export async function obtenerReporteOcupacion({ mes, anio, meses = 1 }) {
  const rango = construirRangoMensual({ mes, anio, meses });

  const filas = await query(
    `
      SELECT
        th.nombre AS tipo_habitacion,
        COUNT(DISTINCT h.id_habitacion) AS habitaciones,
        COALESCE(SUM(GREATEST(DATEDIFF(LEAST(r.fecha_salida, :fechaFin), GREATEST(r.fecha_entrada, :fechaInicio)), 0)), 0) AS noches_ocupadas
      FROM tipos_habitacion th
      LEFT JOIN habitaciones h ON h.id_tipo = th.id_tipo AND h.activo = TRUE
      LEFT JOIN reservas r
        ON r.id_habitacion = h.id_habitacion
        AND r.estado IN ('en_curso', 'completada')
        AND r.fecha_entrada < :fechaFin
        AND r.fecha_salida > :fechaInicio
      GROUP BY th.id_tipo, th.nombre
      ORDER BY th.nombre
    `,
    { fechaInicio: rango.fechaInicio, fechaFin: rango.fechaFinExclusiva },
  );

  return {
    periodo: rango.periodo,
    rango: {
      fecha_inicio: rango.fechaInicio,
      fecha_fin_exclusiva: rango.fechaFinExclusiva,
      dias: rango.dias,
    },
    data: filas.map((fila) => ({
      ...fila,
      porcentaje_ocupacion: calcularPorcentajeOcupacion(fila.noches_ocupadas, fila.habitaciones, rango.dias),
    })),
    exportable: ['json', 'pdf_trigger'],
  };
}

/* istanbul ignore next */
export async function obtenerReporteIngresos({ mes = null, anio = null, meses = 1, fechaInicio = null, fechaFin = null } = {}) {
  const rango = mes && anio
    ? construirRangoMensual({ mes, anio, meses })
    : (() => {
      const rangoFechas = validarRangoFechas(fechaInicio, fechaFin);
      return {
      periodo: null,
      fechaInicio: rangoFechas.fechaInicio,
      fechaFinExclusiva: rangoFechas.fechaFin,
      dias: null,
      };
    })();

  const ingresosHabitaciones = await query(
    `
      SELECT
        tipo_habitacion,
        COALESCE(SUM(ingresos), 0) AS ingresos
      FROM (
        SELECT
          th.nombre AS tipo_habitacion,
          CASE
            WHEN COALESCE(SUM(CASE WHEN it.categoria = 'alojamiento' THEN it.subtotal ELSE 0 END), 0) > 0
              THEN COALESCE(SUM(CASE WHEN it.categoria = 'alojamiento' THEN it.subtotal ELSE 0 END), 0)
            ELSE GREATEST(
              f.subtotal - COALESCE(SUM(CASE WHEN it.categoria = 'servicio_adicional' THEN it.subtotal ELSE 0 END), 0),
              0
            )
          END AS ingresos
        FROM facturas f
        JOIN checkin ci ON ci.id_checkin = f.id_checkin
        JOIN reservas r ON r.id_reserva = ci.id_reserva
        JOIN tipos_habitacion th ON th.id_tipo = r.id_tipo_habitacion
        LEFT JOIN items_factura it ON it.id_factura = f.id_factura
        WHERE (:fechaInicio IS NULL OR f.fecha_emision >= :fechaInicio)
          AND (:fechaFin IS NULL OR f.fecha_emision < :fechaFin)
        GROUP BY f.id_factura, th.nombre, f.subtotal
      ) ingresos_por_factura
      GROUP BY tipo_habitacion
      ORDER BY ingresos DESC
    `,
    { fechaInicio: rango.fechaInicio, fechaFin: rango.fechaFinExclusiva },
  );

  const ingresosServicios = await query(
    `
      SELECT categoria AS tipo_servicio, COALESCE(SUM(ingresos), 0) AS ingresos
      FROM (
        SELECT it.categoria, it.subtotal AS ingresos
        FROM items_factura it
        JOIN facturas f ON f.id_factura = it.id_factura
        WHERE it.categoria = 'servicio_adicional'
          AND (:fechaInicio IS NULL OR f.fecha_emision >= :fechaInicio)
          AND (:fechaFin IS NULL OR f.fecha_emision < :fechaFin)
        UNION ALL
        SELECT sa.categoria, cs.subtotal AS ingresos
        FROM consumo_servicios cs
        JOIN servicios_adicionales sa ON sa.id_servicio = cs.id_servicio
        LEFT JOIN items_factura it
          ON it.id_factura = cs.id_factura
          AND it.categoria = 'servicio_adicional'
          AND ABS(it.subtotal - cs.subtotal) < 0.01
        WHERE cs.estado <> 'cancelado'
          AND it.id_item IS NULL
          AND (:fechaInicio IS NULL OR cs.fecha >= :fechaInicio)
          AND (:fechaFin IS NULL OR cs.fecha < :fechaFin)
      ) ingresos_servicios
      GROUP BY categoria
      ORDER BY ingresos DESC
    `,
    { fechaInicio: rango.fechaInicio, fechaFin: rango.fechaFinExclusiva },
  );

  return {
    periodo: rango.periodo,
    rango: {
      fecha_inicio: rango.fechaInicio,
      fecha_fin_exclusiva: rango.fechaFinExclusiva,
      dias: rango.dias,
    },
    data: {
      habitaciones: ingresosHabitaciones,
      servicios_adicionales: ingresosServicios,
    },
    exportable: ['json', 'pdf_trigger'],
  };
}
