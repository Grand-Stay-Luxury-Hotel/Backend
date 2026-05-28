// src/controllers/huespedes.controller.js
import { buscarHuespedes } from '../services/huespedes.service.js';

export async function getHuespedes(req, res, next) {
  try {
    const resultado = await buscarHuespedes(req.query);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
