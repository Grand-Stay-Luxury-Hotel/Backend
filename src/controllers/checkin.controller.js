// src/controllers/checkin.controller.js
import { registrarCheckin } from '../services/checkin.service.js';

export async function postCheckin(req, res, next) {
  try {
    const resultado = await registrarCheckin(req.params.reservaId, {
      userId: req.user?.id_usuario,
      idRecepcionista: req.user?.id_recepcionista,
      documentoVerificado: req.body?.documento_verificado ?? true,
      observaciones: req.body?.observaciones ?? null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
