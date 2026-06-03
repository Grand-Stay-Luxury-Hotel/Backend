// src/controllers/auditoria.controller.js
import { listarAuditoria, listarFiltrosAuditoria } from '../services/auditoria.service.js';

export async function getAuditoria(req, res, next) {
  try {
    const resultado = await listarAuditoria(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function getFiltrosAuditoria(_req, res, next) {
  try {
    const resultado = await listarFiltrosAuditoria();
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
