// src/services/tarifas.service.js
import { getConnection, query } from '../utils/db.js';
import { ParametrosInvalidosError, RecursoNoEncontradoError } from '../utils/errors.js';
import { logAudit } from '../middleware/audit.middleware.js';

const TEMPORADAS = new Set(['alta', 'media', 'baja']);

function normalizarId(valor, campo) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ParametrosInvalidosError(`${campo} debe ser un numero entero positivo`);
  }
  return id;
}

function normalizarTemporada(valor = 'media') {
  const temporada = String(valor ?? 'media').trim().toLowerCase();
  if (!TEMPORADAS.has(temporada)) {
    throw new ParametrosInvalidosError(`temporada invalida. Valores permitidos: ${Array.from(TEMPORADAS).join(', ')}`);
  }
  return temporada;
}

function validarTarifaPayload(payload, parcial = false) {
  const requeridos = ['id_tipo', 'nombre', 'precio_noche', 'fecha_inicio', 'fecha_fin'];
  if (!parcial) {
    const faltantes = requeridos.filter((campo) => payload[campo] === undefined || payload[campo] === null || payload[campo] === '');
    if (faltantes.length > 0) {
      throw new ParametrosInvalidosError(`Campos obligatorios faltantes: ${faltantes.join(', ')}`);
    }
  }

  const precio = Number(payload.precio_noche);
  if (payload.precio_noche !== undefined && (!Number.isFinite(precio) || precio <= 0)) {
    throw new ParametrosInvalidosError('precio_noche debe ser mayor a cero');
  }

  if (payload.fecha_inicio && payload.fecha_fin) {
    const inicio = new Date(`${payload.fecha_inicio}T00:00:00Z`);
    const fin = new Date(`${payload.fecha_fin}T00:00:00Z`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || inicio > fin) {
      throw new ParametrosInvalidosError('fecha_inicio debe ser anterior o igual a fecha_fin');
    }
  }
}

export async function listarTarifas({ activa = null, idTipo = null } = {}) {
  try {
    const tarifas = await query(
      `
        SELECT
          t.id_tarifa,
          t.id_tipo,
          th.nombre AS tipo_nombre,
          t.nombre,
          t.temporada,
          t.precio_noche,
          t.fecha_inicio,
          t.fecha_fin,
          t.activa,
          t.created_at
        FROM tarifas t
        JOIN tipos_habitacion th ON th.id_tipo = t.id_tipo
        WHERE (:activa IS NULL OR t.activa = :activa)
          AND (:idTipo IS NULL OR t.id_tipo = :idTipo)
        ORDER BY t.activa DESC, th.nombre ASC, t.fecha_inicio DESC, t.id_tarifa DESC
      `,
      {
        activa: activa === null || activa === undefined || activa === '' ? null : ['true', '1', 'si'].includes(String(activa).toLowerCase()),
        idTipo: idTipo ? normalizarId(idTipo, 'idTipo') : null,
      },
    );

    return { data: tarifas, total: tarifas.length };
  } catch (error) {
    throw error;
  }
}

export async function crearTarifa(payload, contexto = {}) {
  const conn = await getConnection();
  try {
    validarTarifaPayload(payload);
    const idTipo = normalizarId(payload.id_tipo, 'id_tipo');
    const temporada = normalizarTemporada(payload.temporada);

    await conn.beginTransaction();
    const [[tipo]] = await conn.execute('SELECT id_tipo FROM tipos_habitacion WHERE id_tipo = :idTipo LIMIT 1', { idTipo });
    if (!tipo) {
      throw new RecursoNoEncontradoError('El tipo de habitacion solicitado no existe');
    }

    const [resultado] = await conn.execute(
      `
        INSERT INTO tarifas
          (id_tipo, nombre, temporada, precio_noche, fecha_inicio, fecha_fin, activa)
        VALUES
          (:idTipo, :nombre, :temporada, :precioNoche, :fechaInicio, :fechaFin, :activa)
      `,
      {
        idTipo,
        nombre: String(payload.nombre).trim(),
        temporada,
        precioNoche: Number(payload.precio_noche),
        fechaInicio: payload.fecha_inicio,
        fechaFin: payload.fecha_fin,
        activa: payload.activa !== false,
      },
    );

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'INSERT',
      tablaAfectada: 'tarifas',
      idRegistro: resultado.insertId,
      valorNuevo: { accion_negocio: 'TARIFA_CREADA', id_tarifa: resultado.insertId },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return { id_tarifa: resultado.insertId, mensaje: 'Tarifa creada exitosamente' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function actualizarTarifa(idTarifa, payload, contexto = {}) {
  const conn = await getConnection();
  try {
    const id = normalizarId(idTarifa, 'id_tarifa');
    validarTarifaPayload(payload, true);
    const temporada = payload.temporada !== undefined ? normalizarTemporada(payload.temporada) : undefined;

    await conn.beginTransaction();
    const [[actual]] = await conn.execute('SELECT * FROM tarifas WHERE id_tarifa = :id FOR UPDATE', { id });
    if (!actual) {
      throw new RecursoNoEncontradoError('La tarifa solicitada no existe');
    }

    const idTipo = payload.id_tipo !== undefined ? normalizarId(payload.id_tipo, 'id_tipo') : actual.id_tipo;
    const [[tipo]] = await conn.execute('SELECT id_tipo FROM tipos_habitacion WHERE id_tipo = :idTipo LIMIT 1', { idTipo });
    if (!tipo) {
      throw new RecursoNoEncontradoError('El tipo de habitacion solicitado no existe');
    }

    await conn.execute(
      `
        UPDATE tarifas
        SET id_tipo = :idTipo,
            nombre = :nombre,
            temporada = :temporada,
            precio_noche = :precioNoche,
            fecha_inicio = :fechaInicio,
            fecha_fin = :fechaFin,
            activa = :activa
        WHERE id_tarifa = :id
      `,
      {
        id,
        idTipo,
        nombre: payload.nombre !== undefined ? String(payload.nombre).trim() : actual.nombre,
        temporada: temporada ?? actual.temporada,
        precioNoche: payload.precio_noche !== undefined ? Number(payload.precio_noche) : Number(actual.precio_noche),
        fechaInicio: payload.fecha_inicio ?? actual.fecha_inicio,
        fechaFin: payload.fecha_fin ?? actual.fecha_fin,
        activa: payload.activa !== undefined ? Boolean(payload.activa) : Boolean(actual.activa),
      },
    );

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'UPDATE',
      tablaAfectada: 'tarifas',
      idRegistro: id,
      valorAnterior: actual,
      valorNuevo: { accion_negocio: 'TARIFA_ACTUALIZADA', id_tarifa: id },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return { id_tarifa: id, mensaje: 'Tarifa actualizada exitosamente' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function desactivarTarifa(idTarifa, contexto = {}) {
  return actualizarTarifa(idTarifa, { activa: false }, contexto);
}
