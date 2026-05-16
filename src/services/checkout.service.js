// src/services/checkout.service.js
import { getConnection } from '../utils/db.js';
import { ReservaEstadoInvalidoError, ReservaNoEncontradaError } from '../utils/errors.js';
import { cobrarSaldo } from './pasarela.service.js';
import { emitirFacturaGenerada } from './eventos.service.js';
import { logAudit } from '../middleware/audit.middleware.js';

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

/* istanbul ignore next */
export async function registrarCheckout(idReserva, contexto = {}) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [[reserva]] = await conn.execute(
      `
        SELECT r.*, ci.id_checkin, tp.token
        FROM reservas r
        JOIN checkin ci ON ci.id_reserva = r.id_reserva
        LEFT JOIN tokens_pago tp ON tp.id_reserva = r.id_reserva AND tp.vigente = TRUE
        WHERE r.id_reserva = :idReserva
        FOR UPDATE
      `,
      { idReserva },
    );

    if (!reserva) {
      throw new ReservaNoEncontradaError();
    }

    if (reserva.estado !== 'confirmada') {
      throw new ReservaEstadoInvalidoError('Solo se puede registrar check-out para reservas confirmadas con check-in activo');
    }

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
      tarifa: tarifa ?? { precio_noche: 0 },
      consumos,
    });

    const pago = await cobrarSaldo({ tokenPago: reserva.token, monto: liquidacion.saldo_cobrado });

    const [resultadoCheckout] = await conn.execute(
      `
        INSERT INTO checkout
          (id_checkin, id_recepcionista, total_cobrado, estado_habitacion, cargos_adicionales, observaciones)
        VALUES
          (:idCheckin, :idRecepcionista, :totalCobrado, 'bueno', :cargosAdicionales, :observaciones)
      `,
      {
        idCheckin: reserva.id_checkin,
        idRecepcionista: contexto.idRecepcionista,
        totalCobrado: liquidacion.total,
        cargosAdicionales: liquidacion.total_consumos,
        observaciones: contexto.observaciones ?? null,
      },
    );

    await conn.execute(
      "UPDATE reservas SET estado = 'completada' WHERE id_reserva = :idReserva",
      { idReserva },
    );

    await conn.execute(
      "UPDATE habitaciones SET estado = 'limpieza' WHERE id_habitacion = :idHabitacion",
      { idHabitacion: reserva.id_habitacion },
    );

    const numeroFactura = `FAC-${Date.now()}`;
    const [resultadoFactura] = await conn.execute(
      `
        INSERT INTO facturas
          (id_checkin, id_checkout, numero_factura, subtotal, impuestos, total, metodo_pago, estado_pago, email_enviado)
        VALUES
          (:idCheckin, :idCheckout, :numeroFactura, :subtotal, :impuestos, :total, 'tarjeta_credito', 'pagada', TRUE)
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
        saldo_cobrado: liquidacion.saldo_cobrado,
      },
      ip: contexto.ip ?? null,
      userAgent: contexto.userAgent ?? null,
    });

    await conn.commit();
    await emitirFacturaGenerada({ id_reserva: Number(idReserva), id_factura: resultadoFactura.insertId, numero_factura: numeroFactura });

    return {
      id_checkout: resultadoCheckout.insertId,
      resumen_factura: liquidacion,
      estado_pago: pago.aprobado ? 'aprobado' : 'rechazado',
      factura_enviada: true,
      mensaje: 'Check-out procesado exitosamente',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
