// src/services/facturas.service.js
import { query } from '../utils/db.js';
import { AccesoDenegadoError, ParametrosInvalidosError, RecursoNoEncontradoError } from '../utils/errors.js';

function normalizarId(valor, campo) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ParametrosInvalidosError(`${campo} debe ser un numero entero positivo`);
  }
  return id;
}

export async function obtenerFacturasPorReserva(idReserva, contexto = {}) {
  try {
    const reservaId = normalizarId(idReserva, 'id_reserva');
    const [reserva] = await query(
      'SELECT id_reserva, id_huesped FROM reservas WHERE id_reserva = :idReserva LIMIT 1',
      { idReserva: reservaId },
    );
    if (!reserva) {
      throw new RecursoNoEncontradoError('La reserva solicitada no existe');
    }

    if (contexto.rol === 'Huesped' && Number(reserva.id_huesped) !== Number(contexto.idHuesped)) {
      throw new AccesoDenegadoError('No puedes consultar facturas de otra reserva');
    }

    const facturas = await query(
      `
        SELECT
          f.id_factura,
          ci.id_reserva,
          f.id_checkin,
          f.id_checkout,
          f.numero_factura,
          f.fecha_emision,
          f.subtotal,
          f.impuesto_pct,
          f.impuestos,
          f.descuentos,
          f.total,
          f.metodo_pago,
          f.moneda,
          f.estado_pago,
          f.email_enviado
        FROM facturas f
        JOIN checkin ci ON ci.id_checkin = f.id_checkin
        WHERE ci.id_reserva = :idReserva
        ORDER BY f.fecha_emision DESC, f.id_factura DESC
      `,
      { idReserva: reservaId },
    );

    return { data: facturas, total: facturas.length };
  } catch (error) {
    throw error;
  }
}
