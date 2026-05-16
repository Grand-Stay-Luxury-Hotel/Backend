// src/controllers/auth.controller.js
import { login } from '../services/auth.service.js';

export async function postLogin(req, res, next) {
  try {
    const resultado = await login(req.body);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}
