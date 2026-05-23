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

export async function getAlertasInventario(req, res, next) {
  try {
    const resultado = await listarAlertasInventario({
      pagina: Number(req.query.pagina) || 1,
      limite: Number(req.query.limite) || 50,
    });
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
