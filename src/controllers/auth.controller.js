// src/controllers/auth.controller.js
import { login, registro } from '../services/auth.service.js';

export async function postLogin(req, res, next) {
  try {
    const resultado = await login(req.body);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function postRegistro(req, res, next) {
  try {
    const resultado = await registro(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}
