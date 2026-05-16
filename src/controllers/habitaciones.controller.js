// src/controllers/habitaciones.controller.js
import { cambiarEstadoHabitacion } from '../services/habitaciones.service.js';

function crearContexto(req) {
  return {
    userId: req.user?.id_usuario,
    rol: req.user?.rol,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    observaciones: req.body?.observaciones,
  };
}

export async function patchEstadoHabitacion(req, res, next) {
  try {
    const resultado = await cambiarEstadoHabitacion(req.params.id, req.body.estado, crearContexto(req));
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
