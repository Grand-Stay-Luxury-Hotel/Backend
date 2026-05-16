// src/controllers/inventario.controller.js
import { actualizarUmbralInventario, listarAlertasInventario, registrarConsumoInventario } from '../services/inventario.service.js';

function crearContexto(req) {
  return {
    userId: req.user?.id_usuario,
    idPersonal: req.user?.id_personal,
    rol: req.user?.rol,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export async function postConsumoInventario(req, res, next) {
  try {
    const resultado = await registrarConsumoInventario(req.body, crearContexto(req));
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function getAlertasInventario(_req, res, next) {
  try {
    const resultado = await listarAlertasInventario();
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function patchUmbralInventario(req, res, next) {
  try {
    const resultado = await actualizarUmbralInventario(req.params.id, req.body.umbral, crearContexto(req));
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
