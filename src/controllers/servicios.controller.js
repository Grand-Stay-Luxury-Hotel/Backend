// src/controllers/servicios.controller.js
import { listarServiciosAdicionales } from '../services/servicios.service.js';

export async function getServiciosAdicionales(req, res, next) {
  try {
    const resultado = await listarServiciosAdicionales(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
