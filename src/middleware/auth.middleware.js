// src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { AccesoDenegadoError, NoAutorizadoError } from '../utils/errors.js';

export async function verifyToken(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new NoAutorizadoError();
    }

    const token = header.replace('Bearer ', '').trim();
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'clave_desarrollo_no_usar_en_produccion');
    req.user = {
      id: payload.id ?? payload.id_usuario,
      id_usuario: payload.id_usuario ?? payload.id,
      id_recepcionista: payload.id_recepcionista ?? null,
      id_personal: payload.id_personal ?? null,
      id_admin: payload.id_admin ?? null,
      rol: payload.rol,
      email: payload.email,
    };
    next();
  } catch (error) {
    next(error.statusCode ? error : new NoAutorizadoError('Token de acceso inválido o expirado'));
  }
}

export function authorizeRoles(...rolesPermitidos) {
  return async function validarRol(req, _res, next) {
    try {
      if (!req.user) {
        throw new NoAutorizadoError();
      }

      const normalizarRol = (rol) => String(rol ?? '').replace(/\s+/g, '').toLowerCase();
      const rolUsuario = normalizarRol(req.user.rol);
      const permitido = rolesPermitidos.some((rol) => normalizarRol(rol) === rolUsuario);

      if (!permitido) {
        throw new AccesoDenegadoError();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
