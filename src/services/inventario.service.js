// src/services/inventario.service.js
import { getConnection, query } from '../utils/db.js';
import { ParametrosInvalidosError, RecursoNoEncontradoError } from '../utils/errors.js';
import { logAudit } from '../middleware/audit.middleware.js';

export function calcularStockResultante(stockActual, cantidadConsumida) {
  const stock = Number(stockActual);
  const cantidad = Number(cantidadConsumida);
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new ParametrosInvalidosError('La cantidad consumida debe ser mayor a cero');
  }
  if (stock - cantidad < 0) {
    throw new ParametrosInvalidosError('El consumo no puede dejar stock negativo');
  }
  return stock - cantidad;
}

export function clasificarCriticidad(stock, umbral) {
  if (Number(stock) <= Number(umbral) / 2) return 'critica';
  if (Number(stock) <= Number(umbral)) return 'alta';
  return 'normal';
}

export function crearAlertaStock({ insumo, stockResultante, habitacionId, criticidad }) {
  return {
    insumo_id: Number(insumo.id_insumo),
    insumo: insumo.nombre,
    habitacion_id: Number(habitacionId),
    stock_actual: Number(stockResultante),
    stock_minimo: Number(insumo.stock_minimo),
    criticidad,
    estado: 'pendiente',
  };
}

/* istanbul ignore next */
export async function registrarConsumoInventario(payload, contexto = {}) {
  const conn = await getConnection();
  try {
    if (!payload.insumoId || !payload.cantidad || !payload.habitacionId) {
      throw new ParametrosInvalidosError('insumoId, cantidad y habitacionId son obligatorios');
    }

    await conn.beginTransaction();
    const [[insumo]] = await conn.execute(
      'SELECT id_insumo, nombre, stock_actual, stock_minimo FROM insumos_limpieza WHERE id_insumo = :idInsumo FOR UPDATE',
      { idInsumo: payload.insumoId },
    );

    if (!insumo) {
      throw new RecursoNoEncontradoError('El insumo solicitado no existe');
    }

    const stockResultante = calcularStockResultante(insumo.stock_actual, payload.cantidad);
    let idPersonal = contexto.idPersonal ?? payload.idPersonal ?? null;
    if (!idPersonal && contexto.userId) {
      const [[personal]] = await conn.execute(
        'SELECT id_personal FROM personal_limpieza WHERE id_usuario = :idUsuario LIMIT 1',
        { idUsuario: contexto.userId },
      );
      idPersonal = personal?.id_personal ?? null;
    }

    if (!idPersonal) {
      throw new ParametrosInvalidosError('idPersonal es obligatorio para registrar consumo de insumos');
    }

    await conn.execute(
      `
        INSERT INTO consumo_insumos
          (id_personal, id_insumo, id_habitacion, tipo_tarea, cantidad, observaciones)
        VALUES
          (:idPersonal, :idInsumo, :idHabitacion, :tipoTarea, :cantidad, :observaciones)
      `,
      {
        idPersonal,
        idInsumo: payload.insumoId,
        idHabitacion: payload.habitacionId,
        tipoTarea: payload.tipoTarea ?? 'limpieza_rutina',
        cantidad: Number(payload.cantidad),
        observaciones: payload.observaciones ?? null,
      },
    );

    await conn.execute(
      'UPDATE insumos_limpieza SET stock_actual = :stockActual WHERE id_insumo = :idInsumo',
      { stockActual: stockResultante, idInsumo: payload.insumoId },
    );

    let alerta = null;
    if (stockResultante <= Number(insumo.stock_minimo)) {
      const criticidad = clasificarCriticidad(stockResultante, insumo.stock_minimo);
      const detalleAlerta = crearAlertaStock({
        insumo,
        stockResultante,
        habitacionId: payload.habitacionId,
        criticidad,
      });
      const [resultadoAlerta] = await conn.execute(
        `
          INSERT INTO notificaciones
            (id_usuario_dest, tipo, evento, destinatario, asunto, cuerpo, estado)
          VALUES
            (NULL, 'interna', 'alerta_stock', 'Administrador', :asunto, :mensaje, 'pendiente')
        `,
        {
          asunto: `Alerta de stock ${criticidad}`,
          mensaje: JSON.stringify(detalleAlerta),
        },
      );
      alerta = { id_notificacion: resultadoAlerta.insertId, ...detalleAlerta };
    }

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'UPDATE',
      tablaAfectada: 'insumos_limpieza',
      idRegistro: Number(payload.insumoId),
      valorAnterior: { stock_actual: Number(insumo.stock_actual) },
      valorNuevo: {
        stock_actual: stockResultante,
        id_habitacion: Number(payload.habitacionId),
        cantidad_consumida: Number(payload.cantidad),
        alerta_generada: Boolean(alerta),
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return { id_insumo: Number(payload.insumoId), stock_actual: stockResultante, alerta, mensaje: 'Consumo de inventario registrado' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/* istanbul ignore next */
export async function listarAlertasInventario() {
  const alertas = await query(
    `
      SELECT
        id_notificacion,
        destinatario,
        asunto,
        cuerpo,
        estado,
        JSON_UNQUOTE(JSON_EXTRACT(cuerpo, '$.insumo_id')) AS id_insumo,
        JSON_UNQUOTE(JSON_EXTRACT(cuerpo, '$.insumo')) AS nombre,
        JSON_UNQUOTE(JSON_EXTRACT(cuerpo, '$.habitacion_id')) AS id_habitacion,
        JSON_UNQUOTE(JSON_EXTRACT(cuerpo, '$.stock_actual')) AS stock_actual,
        JSON_UNQUOTE(JSON_EXTRACT(cuerpo, '$.stock_minimo')) AS stock_minimo,
        JSON_UNQUOTE(JSON_EXTRACT(cuerpo, '$.criticidad')) AS criticidad
      FROM notificaciones
      WHERE evento = 'alerta_stock'
        AND estado = 'pendiente'
      ORDER BY FIELD(
        JSON_UNQUOTE(JSON_EXTRACT(cuerpo, '$.criticidad')),
        'critica',
        'alta'
      ), id_notificacion ASC
    `,
  );
  return { data: alertas, total: alertas.length };
}

/* istanbul ignore next */
export async function actualizarUmbralInventario(idInsumo, umbral, contexto = {}) {
  if (!Number.isFinite(Number(umbral)) || Number(umbral) < 0) {
    throw new ParametrosInvalidosError('El umbral debe ser un numero mayor o igual a cero');
  }
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const [[insumo]] = await conn.execute(
      'SELECT id_insumo, stock_minimo FROM insumos_limpieza WHERE id_insumo = :idInsumo FOR UPDATE',
      { idInsumo },
    );

    if (!insumo) {
      throw new RecursoNoEncontradoError('El insumo solicitado no existe');
    }

    await conn.execute(
      'UPDATE insumos_limpieza SET stock_minimo = :umbral WHERE id_insumo = :idInsumo',
      { umbral: Number(umbral), idInsumo },
    );
    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'UPDATE',
      tablaAfectada: 'insumos_limpieza',
      idRegistro: Number(idInsumo),
      valorAnterior: { stock_minimo: Number(insumo.stock_minimo) },
      valorNuevo: { stock_minimo: Number(umbral) },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return { id_insumo: Number(idInsumo), stock_minimo: Number(umbral), mensaje: 'Umbral actualizado' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
