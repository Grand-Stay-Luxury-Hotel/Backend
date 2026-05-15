// src/controllers/reservas.controller.js
import { cancelarReserva, crearReserva } from '../services/reservas.service.js';

function crearContexto(req) {
  return {
    userId: req.user?.id_usuario,
    idRecepcionista: req.user?.id_recepcionista,
    rol: req.user?.rol,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export async function postReserva(req, res, next) {
  try {
    const resultado = await crearReserva(req.body, crearContexto(req));
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function deleteReserva(req, res, next) {
  try {
    const resultado = await cancelarReserva(req.params.id, crearContexto(req));
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
