// src/controllers/tarifas.controller.js
import { actualizarTarifa, crearTarifa, desactivarTarifa, listarTarifas } from '../services/tarifas.service.js';

function crearContexto(req) {
  return {
    userId: req.user?.id_usuario,
    rol: req.user?.rol,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export async function getTarifas(req, res, next) {
  try {
    const resultado = await listarTarifas(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function postTarifa(req, res, next) {
  try {
    const resultado = await crearTarifa(req.body, crearContexto(req));
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function putTarifa(req, res, next) {
  try {
    const resultado = await actualizarTarifa(req.params.id, req.body, crearContexto(req));
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function deleteTarifa(req, res, next) {
  try {
    const resultado = await desactivarTarifa(req.params.id, crearContexto(req));
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
