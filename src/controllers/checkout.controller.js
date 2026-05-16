// src/controllers/checkout.controller.js
import { registrarCheckout } from '../services/checkout.service.js';

export async function postCheckout(req, res, next) {
  try {
    const resultado = await registrarCheckout(req.params.reservaId, {
      userId: req.user?.id_usuario,
      idRecepcionista: req.user?.id_recepcionista,
      observaciones: req.body?.observaciones ?? null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
