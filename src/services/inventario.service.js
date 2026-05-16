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

    let alerta = null;
    if (stockResultante <= Number(insumo.stock_minimo)) {
      const criticidad = clasificarCriticidad(stockResultante, insumo.stock_minimo);
      const [resultadoAlerta] = await conn.execute(
        `
          INSERT INTO notificaciones
            (id_usuario_dest, tipo, evento, destinatario, asunto, cuerpo, estado)
          VALUES
            (NULL, 'interna', 'alerta_stock', 'Administrador', :asunto, :mensaje, 'pendiente')
        `,
        {
          asunto: `Alerta de stock ${criticidad}`,
          mensaje: `Stock bajo para ${insumo.nombre}`,
        },
      );
      alerta = { id_notificacion: resultadoAlerta.insertId, criticidad };
    }

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'UPDATE',
      tablaAfectada: 'insumos_limpieza',
      idRegistro: Number(payload.insumoId),
      valorAnterior: { stock_actual: Number(insumo.stock_actual) },
      valorNuevo: { stock_actual: stockResultante, alerta_generada: Boolean(alerta) },
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
        id_insumo,
        nombre,
        categoria,
        unidad_medida,
        stock_actual,
        stock_minimo,
        faltante,
        CASE
          WHEN stock_actual <= stock_minimo / 2 THEN 'critica'
          ELSE 'alta'
        END AS criticidad
      FROM v_stock_critico
      ORDER BY FIELD(
        CASE WHEN stock_actual <= stock_minimo / 2 THEN 'critica' ELSE 'alta' END,
        'critica',
        'alta'
      ), faltante DESC
    `,
  );
  return { data: alertas, total: alertas.length };
}

/* istanbul ignore next */
export async function actualizarUmbralInventario(idInsumo, umbral, contexto = {}) {
  if (!Number.isFinite(Number(umbral)) || Number(umbral) < 0) {
    throw new ParametrosInvalidosError('El umbral debe ser un numero mayor o igual a cero');
  }
  await query(
    'UPDATE insumos_limpieza SET stock_minimo = :umbral WHERE id_insumo = :idInsumo',
    { umbral: Number(umbral), idInsumo },
  );
  await logAudit({
    userId: contexto.userId ?? null,
    accion: 'UPDATE',
    tablaAfectada: 'insumos_limpieza',
    idRegistro: Number(idInsumo),
    valorNuevo: { stock_minimo: Number(umbral) },
    ip: contexto.ip ?? null,
    userAgent: contexto.userAgent ?? null,
  });
  return { id_insumo: Number(idInsumo), stock_minimo: Number(umbral), mensaje: 'Umbral actualizado' };
}
