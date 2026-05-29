// src/services/inventario.service.js
import { getConnection, query } from '../utils/db.js';
import { ParametrosInvalidosError, RecursoNoEncontradoError } from '../utils/errors.js';
import { logAudit } from '../middleware/audit.middleware.js';

export function normalizarIdPositivo(valor, nombreCampo) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new ParametrosInvalidosError(`${nombreCampo} debe ser un numero entero positivo`);
  }
  return numero;
}

export function calcularStockResultante(stockActual, cantidadConsumida) {
  const stock = Number(stockActual);
  const cantidad = Number(cantidadConsumida);
  if (!Number.isFinite(stock) || stock < 0) {
    throw new ParametrosInvalidosError('El stock actual debe ser un numero mayor o igual a cero');
  }
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

export function normalizarPaginacionInventario({ pagina = 1, limite = 50 } = {}) {
  const paginaNormalizada = Number(pagina);
  const limiteNormalizado = Number(limite);

  if (!Number.isInteger(paginaNormalizada) || paginaNormalizada < 1) {
    throw new ParametrosInvalidosError('La pagina debe ser un numero entero mayor o igual a uno');
  }

  if (!Number.isInteger(limiteNormalizado) || limiteNormalizado < 1 || limiteNormalizado > 100) {
    throw new ParametrosInvalidosError('El limite debe ser un numero entero entre 1 y 100');
  }

  return { pagina: paginaNormalizada, limite: limiteNormalizado };
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

    const idInsumo = normalizarIdPositivo(payload.insumoId, 'insumoId');
    const idHabitacion = normalizarIdPositivo(payload.habitacionId, 'habitacionId');

    await conn.beginTransaction();
    const [[insumo]] = await conn.execute(
      'SELECT id_insumo, nombre, stock_actual, stock_minimo FROM insumos_limpieza WHERE id_insumo = :idInsumo FOR UPDATE',
      { idInsumo },
    );

    if (!insumo) {
      throw new RecursoNoEncontradoError('El insumo solicitado no existe');
    }

    const [[habitacion]] = await conn.execute(
      'SELECT id_habitacion FROM habitaciones WHERE id_habitacion = :idHabitacion LIMIT 1',
      { idHabitacion },
    );

    if (!habitacion) {
      throw new RecursoNoEncontradoError('La habitacion solicitada no existe');
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

    idPersonal = normalizarIdPositivo(idPersonal, 'idPersonal');
    const [[personalExistente]] = await conn.execute(
      'SELECT id_personal FROM personal_limpieza WHERE id_personal = :idPersonal LIMIT 1',
      { idPersonal },
    );

    if (!personalExistente) {
      throw new RecursoNoEncontradoError('El personal de limpieza solicitado no existe');
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
        idInsumo,
        idHabitacion,
        tipoTarea: payload.tipoTarea ?? 'limpieza_rutina',
        cantidad: Number(payload.cantidad),
        observaciones: payload.observaciones ?? null,
      },
    );

    await conn.execute(
      'UPDATE insumos_limpieza SET stock_actual = :stockActual WHERE id_insumo = :idInsumo',
      { stockActual: stockResultante, idInsumo },
    );

    let alerta = null;
    if (stockResultante <= Number(insumo.stock_minimo)) {
      const criticidad = clasificarCriticidad(stockResultante, insumo.stock_minimo);
      const detalleAlerta = crearAlertaStock({
        insumo,
        stockResultante,
        habitacionId: idHabitacion,
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
      idRegistro: idInsumo,
      valorAnterior: { stock_actual: Number(insumo.stock_actual) },
      valorNuevo: {
        stock_actual: stockResultante,
        id_habitacion: idHabitacion,
        cantidad_consumida: Number(payload.cantidad),
        alerta_generada: Boolean(alerta),
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return { id_insumo: idInsumo, stock_actual: stockResultante, alerta, mensaje: 'Consumo de inventario registrado' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/* istanbul ignore next */
export async function listarAlertasInventario({ pagina = 1, limite = 50 } = {}) {
  const paginacion = normalizarPaginacionInventario({ pagina, limite });
  const offset = (paginacion.pagina - 1) * paginacion.limite;

  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM notificaciones WHERE evento = 'alerta_stock' AND estado = 'pendiente'`,
  );

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
      LIMIT ${paginacion.limite} OFFSET ${offset}
    `,
    {},
  );
  return { data: alertas, total, pagina: paginacion.pagina, limite: paginacion.limite };
}

/* istanbul ignore next */
export async function listarInsumosInventario({ pagina = 1, limite = 100, buscar = '' } = {}) {
  const paginacion = normalizarPaginacionInventario({ pagina, limite });
  const offset = (paginacion.pagina - 1) * paginacion.limite;
  const patronBusqueda = String(buscar ?? '').trim();

  const [{ total }] = await query(
    `
      SELECT COUNT(*) AS total
      FROM insumos_limpieza
      WHERE (:buscar = '' OR nombre LIKE :buscarLike OR categoria LIKE :buscarLike)
    `,
    { buscar: patronBusqueda, buscarLike: `%${patronBusqueda}%` },
  );

  const data = await query(
    `
      SELECT
        id_insumo,
        nombre,
        categoria,
        unidad_medida,
        stock_actual,
        stock_minimo,
        GREATEST(stock_minimo - stock_actual, 0) AS faltante,
        updated_at
      FROM insumos_limpieza
      WHERE (:buscar = '' OR nombre LIKE :buscarLike OR categoria LIKE :buscarLike)
      ORDER BY nombre ASC
      LIMIT ${paginacion.limite} OFFSET ${offset}
    `,
    {
      buscar: patronBusqueda,
      buscarLike: `%${patronBusqueda}%`,
    },
  );

  return { data, total, pagina: paginacion.pagina, limite: paginacion.limite };
}

/* istanbul ignore next */
export async function listarHistorialInventario({ pagina = 1, limite = 50, idInsumo = null, idHabitacion = null } = {}) {
  const paginacion = normalizarPaginacionInventario({ pagina, limite });
  const offset = (paginacion.pagina - 1) * paginacion.limite;
  const filtroInsumo = idInsumo ? normalizarIdPositivo(idInsumo, 'idInsumo') : null;
  const filtroHabitacion = idHabitacion ? normalizarIdPositivo(idHabitacion, 'idHabitacion') : null;

  const [{ total }] = await query(
    `
      SELECT COUNT(*) AS total
      FROM consumo_insumos ci
      WHERE (:idInsumo IS NULL OR ci.id_insumo = :idInsumo)
        AND (:idHabitacion IS NULL OR ci.id_habitacion = :idHabitacion)
    `,
    { idInsumo: filtroInsumo, idHabitacion: filtroHabitacion },
  );

  const data = await query(
    `
      SELECT
        ci.id_consumo_insumo AS id_consumo,
        ci.id_personal,
        CONCAT(u.nombre, ' ', u.apellido) AS personal_nombre,
        ci.id_insumo,
        il.nombre AS insumo_nombre,
        il.categoria,
        ci.id_habitacion,
        h.numero_habitacion,
        ci.tipo_tarea,
        ci.cantidad,
        ci.observaciones,
        ci.fecha AS fecha_consumo
      FROM consumo_insumos ci
      JOIN insumos_limpieza il ON il.id_insumo = ci.id_insumo
      JOIN habitaciones h ON h.id_habitacion = ci.id_habitacion
      JOIN personal_limpieza pl ON pl.id_personal = ci.id_personal
      JOIN usuarios u ON u.id_usuario = pl.id_usuario
      WHERE (:idInsumo IS NULL OR ci.id_insumo = :idInsumo)
        AND (:idHabitacion IS NULL OR ci.id_habitacion = :idHabitacion)
      ORDER BY ci.fecha DESC, ci.id_consumo_insumo DESC
      LIMIT ${paginacion.limite} OFFSET ${offset}
    `,
    { idInsumo: filtroInsumo, idHabitacion: filtroHabitacion },
  );

  return { data, total, pagina: paginacion.pagina, limite: paginacion.limite };
}

/* istanbul ignore next */
export async function actualizarUmbralInventario(idInsumo, umbral, contexto = {}) {
  const idInsumoNormalizado = normalizarIdPositivo(idInsumo, 'idInsumo');
  if (!Number.isFinite(Number(umbral)) || Number(umbral) < 0) {
    throw new ParametrosInvalidosError('El umbral debe ser un numero mayor o igual a cero');
  }
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const [[insumo]] = await conn.execute(
      'SELECT id_insumo, stock_minimo FROM insumos_limpieza WHERE id_insumo = :idInsumo FOR UPDATE',
      { idInsumo: idInsumoNormalizado },
    );

    if (!insumo) {
      throw new RecursoNoEncontradoError('El insumo solicitado no existe');
    }

    await conn.execute(
      'UPDATE insumos_limpieza SET stock_minimo = :umbral WHERE id_insumo = :idInsumo',
      { umbral: Number(umbral), idInsumo: idInsumoNormalizado },
    );
    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'UPDATE',
      tablaAfectada: 'insumos_limpieza',
      idRegistro: idInsumoNormalizado,
      valorAnterior: { stock_minimo: Number(insumo.stock_minimo) },
      valorNuevo: { stock_minimo: Number(umbral) },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    return { id_insumo: idInsumoNormalizado, stock_minimo: Number(umbral), mensaje: 'Umbral actualizado' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
