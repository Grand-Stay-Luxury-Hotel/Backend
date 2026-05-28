// src/controllers/habitaciones.controller.js
import { cambiarEstadoHabitacion, listarHabitaciones } from '../services/habitaciones.service.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

function crearContexto(req) {
  return {
    userId: req.user?.id_usuario,
    rol: req.user?.rol,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    observaciones: req.body?.observaciones,
  };
}

const ESTADOS_VALIDOS = ['disponible', 'ocupada', 'mantenimiento', 'limpieza', 'bloqueada'];

export async function getHabitaciones(req, res, next) {
  try {
    const resultado = await listarHabitaciones(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function patchEstadoHabitacion(req, res, next) {
  try {
    const estado = req.body?.estado;
    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      throw new ParametrosInvalidosError(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}`);
    }
    const resultado = await cambiarEstadoHabitacion(req.params.id, estado, crearContexto(req));
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
