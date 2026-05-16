// src/controllers/reportes.controller.js
import { obtenerReporteIngresos, obtenerReporteOcupacion } from '../services/reportes.service.js';

export async function getReporteOcupacion(req, res, next) {
  try {
    const resultado = await obtenerReporteOcupacion(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function getReporteIngresos(req, res, next) {
  try {
    const resultado = await obtenerReporteIngresos(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
