// src/services/checkout.service.js
import { getConnection, query } from '../utils/db.js';
import {
  CheckoutDuplicadoError,
  EntidadNoProcesableError,
  ParametrosInvalidosError,
  ReservaEstadoInvalidoError,
  ReservaNoEncontradaError,
} from '../utils/errors.js';
import { cobrarSaldo } from './pasarela.service.js';
import { emitirFacturaGenerada } from './eventos.service.js';
import { logAudit } from '../middleware/audit.middleware.js';
import { cambiarEstadoHabitacionEnTransaccion } from './habitaciones.service.js';

export const ESTADO_RESERVA_CHECKOUT = 'completada';
export const ESTADO_HABITACION_POST_CHECKOUT = 'limpieza';
export const ESTADOS_RESERVA_PERMITIDOS_CHECKOUT = new Set(['en_curso']);
export const ESTADOS_HABITACION_CHECKOUT = new Set(['bueno', 'danos_menores', 'danos_graves', 'pendiente_revision']);

export function diffDias(fechaEntrada, fechaSalida) {
  const entrada = new Date(`${fechaEntrada}T00:00:00Z`);
  const salida = new Date(`${fechaSalida}T00:00:00Z`);
  return Math.ceil((salida - entrada) / (1000 * 60 * 60 * 24));
}

export function calcularLiquidacion({ reserva, tarifa, consumos }) {
  const noches = diffDias(reserva.fecha_entrada, reserva.fecha_salida);
  const tarifaBase = Number(tarifa.precio_noche) * noches;
  const totalConsumos = consumos.reduce((acc, consumo) => acc + Number(consumo.cantidad) * Number(consumo.precio_unitario), 0);
  const subtotal = tarifaBase + totalConsumos;
  const impuestos = Number((subtotal * 0.19).toFixed(2));
  const total = Number((subtotal + impuestos).toFixed(2));
  const anticipoPagado = Number(reserva.monto_pagado ?? 0);
  const saldoPendiente = Number(Math.max(total - anticipoPagado, 0).toFixed(2));

  return {
    tarifa_base: tarifaBase,
    total_consumos: totalConsumos,
    subtotal,
    impuestos,
    total,
    anticipo_pagado: anticipoPagado,
    saldo_cobrado: saldoPendiente,
  };
}

export function crearFacturaElectronicaPayload({ numeroFactura, idFactura, idReserva, liquidacion }) {
  return {
    numero_factura: numeroFactura,
    id_factura: idFactura,
    id_reserva: Number(idReserva),
    formato: 'pdf',
    archivo: `${numeroFactura}.pdf`,
    contenido_base64: Buffer.from(JSON.stringify({
      numero_factura: numeroFactura,
      resumen: liquidacion,
    })).toString('base64'),
  };
}

export function validarEstadoReservaParaCheckout(estado, tieneCheckin) {
  if (!tieneCheckin || !ESTADOS_RESERVA_PERMITIDOS_CHECKOUT.has(estado)) {
    throw new ReservaEstadoInvalidoError('Solo se puede registrar check-out para reservas con estadia activa');
  }
}

export function normalizarEstadoHabitacionCheckout(estado) {
  const normalizado = String(estado ?? 'pendiente_revision').trim().toLowerCase();
  if (!ESTADOS_HABITACION_CHECKOUT.has(normalizado)) {
    throw new ParametrosInvalidosError(
      `estado_habitacion invalido. Valores permitidos: ${Array.from(ESTADOS_HABITACION_CHECKOUT).join(', ')}`,
    );
  }
  return normalizado;
}

export function validarTarifaParaCheckout(tarifa) {
  if (!tarifa || Number(tarifa.precio_noche) <= 0) {
    throw new EntidadNoProcesableError('No existe una tarifa activa para liquidar esta reserva');
  }
}

export async function obtenerResumenCheckout(idReserva) {
  try {
    const [reserva] = await query(
      `
        SELECT r.*, ci.id_checkin, co.id_checkout
        FROM reservas r
        LEFT JOIN checkin ci ON ci.id_reserva = r.id_reserva
        LEFT JOIN checkout co ON co.id_checkin = ci.id_checkin
        WHERE r.id_reserva = :idReserva
        LIMIT 1
      `,
      { idReserva },
    );

    if (!reserva) {
      throw new ReservaNoEncontradaError();
    }

    validarEstadoReservaParaCheckout(reserva.estado, reserva.id_checkin);

    const [tarifa] = await query(
      `
        SELECT precio_noche
        FROM tarifas
        WHERE id_tipo = :idTipo
          AND activa = TRUE
          AND fecha_inicio <= :fechaEntrada
          AND fecha_fin >= :fechaSalida
        ORDER BY fecha_inicio DESC
        LIMIT 1
      `,
      { idTipo: reserva.id_tipo_habitacion, fechaEntrada: reserva.fecha_entrada, fechaSalida: reserva.fecha_salida },
    );
    validarTarifaParaCheckout(tarifa);

    const consumos = await query(
      `
        SELECT
          cs.id_consumo_servicio AS id_consumo,
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
        JOIN servicios_adicionales sa ON sa.id_servicio = cs.id_servicio
        WHERE cs.id_reserva = :idReserva AND cs.estado <> 'cancelado'
        ORDER BY cs.fecha DESC
      `,
      { idReserva },
    );

    const liquidacion = calcularLiquidacion({ reserva, tarifa, consumos });
    return {
      id_reserva: Number(idReserva),
      estado: reserva.estado,
      fecha_entrada: reserva.fecha_entrada,
      fecha_salida: reserva.fecha_salida,
      consumos,
      total_consumos: liquidacion.total_consumos,
      total_facturado: liquidacion.total,
      saldo_pendiente: liquidacion.saldo_cobrado,
      resumen_factura: liquidacion,
    };
  } catch (error) {
    throw error;
  }
}

/* istanbul ignore next */
async function encolarEnvioFactura(conn, { reserva, numeroFactura, facturaElectronica }) {
  const [resultado] = await conn.execute(
    `
      INSERT INTO notificaciones
        (id_usuario_dest, tipo, evento, destinatario, asunto, cuerpo, estado)
      VALUES
        (:idUsuarioDest, 'email', 'factura_checkout',
         :destinatario, :asunto, :cuerpo, 'pendiente')
    `,
    {
      idUsuarioDest: reserva.id_usuario_huesped,
      destinatario: reserva.email_huesped,
      asunto: `Factura electronica ${numeroFactura}`,
      cuerpo: JSON.stringify({
        mensaje: `Factura electronica generada para la reserva ${reserva.codigo_confirmacion}`,
        factura: facturaElectronica,
      }),
    },
  );

  return resultado.insertId;
}

/* istanbul ignore next */
export async function registrarCheckout(idReserva, contexto = {}) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const estadoHabitacionCheckout = normalizarEstadoHabitacionCheckout(contexto.estadoHabitacionCheckout);

    const [[reserva]] = await conn.execute(
      `
        SELECT r.*, ci.id_checkin, co.id_checkout, tp.token, h.email AS email_huesped, h.id_usuario AS id_usuario_huesped
        FROM reservas r
        LEFT JOIN checkin ci ON ci.id_reserva = r.id_reserva
        LEFT JOIN checkout co ON co.id_checkin = ci.id_checkin
        JOIN huespedes h ON h.id_huesped = r.id_huesped
        LEFT JOIN tokens_pago tp ON tp.id_reserva = r.id_reserva AND tp.vigente = TRUE
        WHERE r.id_reserva = :idReserva
        FOR UPDATE
      `,
      { idReserva },
    );

    if (!reserva) {
      throw new ReservaNoEncontradaError();
    }

    if (reserva.id_checkout) {
      throw new CheckoutDuplicadoError();
    }

    validarEstadoReservaParaCheckout(reserva.estado, reserva.id_checkin);

    const [[tarifa]] = await conn.execute(
      `
        SELECT precio_noche
        FROM tarifas
        WHERE id_tipo = :idTipo
          AND activa = TRUE
          AND fecha_inicio <= :fechaEntrada
          AND fecha_fin >= :fechaSalida
        ORDER BY fecha_inicio DESC
        LIMIT 1
      `,
      { idTipo: reserva.id_tipo_habitacion, fechaEntrada: reserva.fecha_entrada, fechaSalida: reserva.fecha_salida },
    );
    validarTarifaParaCheckout(tarifa);

    const [consumos] = await conn.execute(
      `
        SELECT cantidad, precio_aplicado AS precio_unitario
        FROM consumo_servicios
        WHERE id_reserva = :idReserva AND estado <> 'cancelado'
      `,
      { idReserva },
    );

    const liquidacion = calcularLiquidacion({
      reserva,
      tarifa,
      consumos,
    });

    const pago = await cobrarSaldo({ tokenPago: reserva.token, monto: liquidacion.saldo_cobrado });
    if (liquidacion.saldo_cobrado > 0) {
      await logAudit({
        conn,
        userId: contexto.userId ?? null,
        accion: 'INSERT',
        tablaAfectada: 'facturas',
        idRegistro: Number(idReserva),
        valorNuevo: {
          accion_negocio: 'COBRO_SALDO_CHECKOUT',
          id_reserva: Number(idReserva),
          monto: liquidacion.saldo_cobrado,
          referencia: pago.referencia,
          proveedor: pago.proveedor,
        },
        ip: contexto.ip ?? null,
        userAgent: contexto.userAgent ?? null,
      });
    }

    const [resultadoCheckout] = await conn.execute(
      `
        INSERT INTO checkout
          (id_checkin, id_recepcionista, total_cobrado, estado_habitacion, cargos_adicionales, observaciones)
        VALUES
          (:idCheckin, :idRecepcionista, :totalCobrado, :estadoHabitacion, :cargosAdicionales, :observaciones)
      `,
      {
        idCheckin: reserva.id_checkin,
        idRecepcionista: contexto.idRecepcionista,
        totalCobrado: liquidacion.total,
        estadoHabitacion: estadoHabitacionCheckout,
        cargosAdicionales: liquidacion.total_consumos,
        observaciones: contexto.observaciones ?? null,
      },
    );

    await conn.execute(
      'UPDATE reservas SET estado = :estado WHERE id_reserva = :idReserva',
      { estado: ESTADO_RESERVA_CHECKOUT, idReserva },
    );

    const cambioHabitacion = await cambiarEstadoHabitacionEnTransaccion(conn, reserva.id_habitacion, ESTADO_HABITACION_POST_CHECKOUT, {
      ...contexto,
      rol: contexto.rol ?? 'Recepcionista',
      accionNegocio: 'CHECKOUT_HABITACION_LIMPIEZA',
      observaciones: contexto.observaciones ?? `Check-out reserva ${idReserva}`,
    });

    const numeroFactura = `FAC-${Date.now()}`;
    const [resultadoFactura] = await conn.execute(
      `
        INSERT INTO facturas
          (id_checkin, id_checkout, numero_factura, subtotal, impuestos, total, metodo_pago, estado_pago, email_enviado)
        VALUES
          (:idCheckin, :idCheckout, :numeroFactura, :subtotal, :impuestos, :total, 'tarjeta_credito', 'pagada', FALSE)
      `,
      {
        idCheckin: reserva.id_checkin,
        idCheckout: resultadoCheckout.insertId,
        numeroFactura,
        subtotal: liquidacion.subtotal,
        impuestos: liquidacion.impuestos,
        total: liquidacion.total,
      },
    );

    const facturaElectronica = crearFacturaElectronicaPayload({
      numeroFactura,
      idFactura: resultadoFactura.insertId,
      idReserva,
      liquidacion,
    });
    const idNotificacion = await encolarEnvioFactura(conn, { reserva, numeroFactura, facturaElectronica });

    await logAudit({
      conn,
      userId: contexto.userId ?? null,
      accion: 'INSERT',
      tablaAfectada: 'checkout',
      idRegistro: resultadoCheckout.insertId,
      valorNuevo: {
        accion_negocio: 'CHECKOUT',
        id_reserva: Number(idReserva),
        id_factura: resultadoFactura.insertId,
        id_notificacion: idNotificacion,
        saldo_cobrado: liquidacion.saldo_cobrado,
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    await emitirFacturaGenerada({
      id_reserva: Number(idReserva),
      id_factura: resultadoFactura.insertId,
      numero_factura: numeroFactura,
      id_notificacion: idNotificacion,
    });

    return {
      id_checkout: resultadoCheckout.insertId,
      resumen_factura: liquidacion,
      estado_pago: pago.aprobado ? 'aprobado' : 'rechazado',
      factura_electronica: facturaElectronica,
      factura_enviada: false,
      notificacion_encolada: true,
      id_notificacion: idNotificacion,
      estado_reserva: ESTADO_RESERVA_CHECKOUT,
      estado_habitacion: cambioHabitacion.estado_nuevo,
      estado_habitacion_checkout: estadoHabitacionCheckout,
      mensaje: 'Check-out procesado exitosamente',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
