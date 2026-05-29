// src/controllers/facturas.controller.js
import { obtenerFacturasPorReserva } from '../services/facturas.service.js';

export async function getFacturasReserva(req, res, next) {
  try {
    const resultado = await obtenerFacturasPorReserva(req.params.reservaId, {
      userId: req.user?.id_usuario,
      idHuesped: req.user?.id_huesped,
      rol: req.user?.rol,
    });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
