// src/controllers/auditoria.controller.js
import { listarAuditoria } from '../services/auditoria.service.js';

export async function getAuditoria(req, res, next) {
  try {
    const resultado = await listarAuditoria(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
