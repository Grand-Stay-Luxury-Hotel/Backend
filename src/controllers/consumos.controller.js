// src/controllers/consumos.controller.js
import { listarConsumosPorReserva, listarMisConsumos, registrarConsumo } from '../services/consumos.service.js';

function crearContexto(req) {
  return {
    userId: req.user?.id_usuario,
    rol: req.user?.rol,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export async function postConsumo(req, res, next) {
  try {
    const resultado = await registrarConsumo(req.body, crearContexto(req));
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function getConsumosPorReserva(req, res, next) {
  try {
    const resultado = await listarConsumosPorReserva(req.params.reservaId, {
      ...crearContexto(req),
      idHuesped: req.user?.id_huesped,
    });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function getMisConsumos(req, res, next) {
  try {
    const resultado = await listarMisConsumos({
      ...crearContexto(req),
      idHuesped: req.user?.id_huesped,
    });
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
