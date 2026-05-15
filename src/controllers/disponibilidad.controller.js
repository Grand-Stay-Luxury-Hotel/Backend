// src/controllers/disponibilidad.controller.js
import { consultarDisponibilidad } from '../services/disponibilidad.service.js';

export async function obtenerDisponibilidad(req, res, next) {
  try {
    const resultado = await consultarDisponibilidad(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
