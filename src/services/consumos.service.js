// src/services/consumos.service.js
import { getConnection, query } from '../utils/db.js';
import {
  AccesoDenegadoError,
  EntidadNoProcesableError,
  ParametrosInvalidosError,
  RecursoNoEncontradoError,
} from '../utils/errors.js';
import { logAudit } from '../middleware/audit.middleware.js';

const TIPOS_CONSUMO = new Set(['restaurante', 'lavanderia', 'spa']);

function normalizarTexto(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function calcularTotalConsumo({ cantidad, precio_unitario: precioUnitario }) {
  const unidades = Number(cantidad);
  const precio = Number(precioUnitario);
  if (!Number.isFinite(unidades) || unidades <= 0 || !Number.isFinite(precio) || precio <= 0) {
    throw new ParametrosInvalidosError('Cantidad y precio unitario deben ser mayores a cero');
  }
  return Number((unidades * precio).toFixed(2));
}

export function validarTipoConsumo(tipo) {
  const normalizado = normalizarTexto(tipo);
  if (!TIPOS_CONSUMO.has(normalizado)) {
    throw new ParametrosInvalidosError('Tipo de consumo invalido');
  }
  return normalizado;
}

export function calcularTotalConsumoDb({ cantidad, precio }) {
  return calcularTotalConsumo({ cantidad, precio_unitario: precio });
}

function normalizarIdPositivo(valor, nombreCampo) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ParametrosInvalidosError(`${nombreCampo} debe ser un numero entero positivo`);
  }
  return id;
}

function formatearConsumo(consumo) {
  return {
    ...consumo,
    cantidad: Number(consumo.cantidad),
    precio_unitario: Number(consumo.precio_unitario),
    subtotal: Number(consumo.subtotal),
  };
}

function resumenConsumos(consumos) {
  return Number(consumos.reduce((total, consumo) => total + Number(consumo.subtotal), 0).toFixed(2));
}

export async function listarConsumosPorReserva(idReserva, contexto = {}) {
  try {
    const reservaId = normalizarIdPositivo(idReserva, 'id_reserva');
    const [reserva] = await query(
      `
        SELECT id_reserva, id_huesped
        FROM reservas
        WHERE id_reserva = :idReserva
        LIMIT 1
      `,
      { idReserva: reservaId },
    );

    if (!reserva) {
      throw new RecursoNoEncontradoError('La reserva solicitada no existe');
    }

    if (contexto.rol === 'Huesped' && Number(reserva.id_huesped) !== Number(contexto.idHuesped)) {
      throw new AccesoDenegadoError('No puedes consultar consumos de otra reserva');
    }

    const consumos = await query(
      `
        SELECT
          cs.id_consumo_servicio AS id_consumo,
          cs.id_reserva,
          cs.id_habitacion,
          h.numero_habitacion,
          cs.id_servicio,
          sa.nombre AS servicio_nombre,
          sa.categoria AS tipo,
          cs.cantidad,
          cs.precio_aplicado AS precio_unitario,
          cs.subtotal,
          cs.fecha,
          cs.estado,
          cs.notas
        FROM consumo_servicios cs
        JOIN habitaciones h ON h.id_habitacion = cs.id_habitacion
        JOIN servicios_adicionales sa ON sa.id_servicio = cs.id_servicio
        WHERE cs.id_reserva = :idReserva
          AND cs.estado <> 'cancelado'
        ORDER BY cs.fecha DESC, cs.id_consumo_servicio DESC
      `,
      { idReserva: reservaId },
    );
    const data = consumos.map(formatearConsumo);

    return {
      data,
      total: data.length,
      total_consumos: resumenConsumos(data),
      mensaje: data.length === 0 ? 'No hay consumos registrados para esta reserva' : undefined,
    };
  } catch (error) {
    throw error;
  }
}

export async function listarMisConsumos(contexto = {}) {
  try {
    const idHuesped = normalizarIdPositivo(contexto.idHuesped, 'id_huesped');
    const consumos = await query(
      `
        SELECT
          cs.id_consumo_servicio AS id_consumo,
          cs.id_reserva,
          r.codigo_confirmacion,
          cs.id_habitacion,
          h.numero_habitacion,
          cs.id_servicio,
          sa.nombre AS servicio_nombre,
          sa.categoria AS tipo,
          cs.cantidad,
          cs.precio_aplicado AS precio_unitario,
          cs.subtotal,
          cs.fecha,
          cs.estado,
          cs.notas
        FROM consumo_servicios cs
        JOIN reservas r ON r.id_reserva = cs.id_reserva
        JOIN habitaciones h ON h.id_habitacion = cs.id_habitacion
        JOIN servicios_adicionales sa ON sa.id_servicio = cs.id_servicio
        WHERE r.id_huesped = :idHuesped
          AND cs.estado <> 'cancelado'
        ORDER BY cs.fecha DESC, cs.id_consumo_servicio DESC
      `,
      { idHuesped },
    );
    const data = consumos.map(formatearConsumo);

    return {
      data,
      total: data.length,
      total_consumos: resumenConsumos(data),
      mensaje: data.length === 0 ? 'No tienes consumos registrados' : undefined,
    };
  } catch (error) {
    throw error;
  }
}

/* istanbul ignore next */
export async function registrarConsumo(payload, contexto = {}) {
  const conn = await getConnection();
  try {
    const tipo = validarTipoConsumo(payload.tipo);
    if (!payload.habitacionId || !payload.descripcion) {
      throw new ParametrosInvalidosError('habitacionId y descripcion son obligatorios');
    }

    await conn.beginTransaction();
    const [[ocupacion]] = await conn.execute(
      `
        SELECT h.id_habitacion, h.estado, r.id_reserva, ci.id_checkin, co.id_checkout
        FROM habitaciones h
        LEFT JOIN reservas r
          ON r.id_habitacion = h.id_habitacion
          AND r.estado = 'en_curso'
        LEFT JOIN checkin ci
          ON ci.id_reserva = r.id_reserva
        LEFT JOIN checkout co
          ON co.id_checkin = ci.id_checkin
        WHERE h.id_habitacion = :habitacionId
        FOR UPDATE
      `,
      { habitacionId: payload.habitacionId },
    );

    if (!ocupacion) {
      throw new RecursoNoEncontradoError('La habitacion solicitada no existe');
    }

    if (ocupacion.estado !== 'ocupada' || !ocupacion.id_reserva || !ocupacion.id_checkin || ocupacion.id_checkout) {
      throw new EntidadNoProcesableError('Solo se pueden registrar consumos en habitaciones ocupadas');
    }

    const [[servicio]] = await conn.execute(
      `
        SELECT id_servicio, categoria, precio
        FROM servicios_adicionales
        WHERE (:idServicio IS NULL OR id_servicio = :idServicio)
          AND categoria = :tipo
          AND activo = TRUE
          AND disponible = TRUE
        ORDER BY id_servicio
        LIMIT 1
      `,
      { idServicio: payload.id_servicio ?? null, tipo },
    );

    if (!servicio) {
      throw new RecursoNoEncontradoError(`No existe un servicio activo para la categoria ${tipo}`);
    }

    const total = calcularTotalConsumoDb({ cantidad: payload.cantidad, precio: servicio.precio });

    const [resultado] = await conn.execute(
      `
        INSERT INTO consumo_servicios
          (id_reserva, id_habitacion, id_servicio, cantidad, precio_aplicado, subtotal, estado, notas)
        VALUES
          (:idReserva, :idHabitacion, :idServicio, :cantidad, :precio, :subtotal, 'completado', :notas)
      `,
      {
        idReserva: ocupacion.id_reserva,
        idHabitacion: payload.habitacionId,
        idServicio: servicio.id_servicio,
        cantidad: Number(payload.cantidad),
        precio: Number(servicio.precio),
        subtotal: total,
        notas: payload.descripcion,
      },
    );

    const [[acumulado]] = await conn.execute(
      `
        SELECT COALESCE(SUM(subtotal), 0) AS total_consumos
        FROM consumo_servicios
        WHERE id_reserva = :idReserva AND estado <> 'cancelado'
      `,
      { idReserva: ocupacion.id_reserva },
    );

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'INSERT',
      tablaAfectada: 'consumo_servicios',
      idRegistro: resultado.insertId,
      valorNuevo: {
        accion_negocio: 'CONSUMO_ADICIONAL',
        id_reserva: ocupacion.id_reserva,
        id_habitacion: Number(payload.habitacionId),
        tipo,
        total,
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return {
      id_consumo: resultado.insertId,
      id_reserva: ocupacion.id_reserva,
      total_consumo: total,
      total_acumulado: Number(acumulado.total_consumos),
      cuenta_habitacion: {
        id_habitacion: Number(payload.habitacionId),
        id_reserva: ocupacion.id_reserva,
        total_consumos: Number(acumulado.total_consumos),
      },
      mensaje: 'Consumo registrado exitosamente',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
