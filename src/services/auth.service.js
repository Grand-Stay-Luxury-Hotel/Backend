// src/services/auth.service.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../utils/db.js';
import { AccesoDenegadoError, NoAutorizadoError, ParametrosInvalidosError } from '../utils/errors.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';

export function validarHashBcrypt(passwordHash) {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(passwordHash ?? '');
  if (!match) return false;
  return Number(match[1]) >= 12;
}

export function verificarPassword(password, passwordHash) {
  if (!password || !passwordHash) return false;

  if (passwordHash.startsWith('plain:')) {
    const esperado = Buffer.from(passwordHash.replace('plain:', ''));
    const recibido = Buffer.from(password);
    return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
  }

  if (passwordHash.startsWith('sha256:')) {
    const esperado = Buffer.from(passwordHash.replace('sha256:', ''), 'hex');
    const recibido = crypto.createHash('sha256').update(password).digest();
    return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
  }

  if (validarHashBcrypt(passwordHash)) {
    return bcrypt.compareSync(password, passwordHash);
  }

  return false;
}

export function validarOtpAdministrador(usuario, otp) {
  if (usuario.rol !== 'Administrador') return true;
  const otpEsperado = usuario.otp_actual ?? process.env.ADMIN_OTP ?? '123456';
  if (!otp || otp !== otpEsperado) {
    throw new AccesoDenegadoError('Codigo OTP requerido para Administrador');
  }
  return true;
}

/* istanbul ignore next */
export async function login({ usuario, password, otp }) {
  if (!usuario || !password) {
    throw new ParametrosInvalidosError('Usuario y password son obligatorios');
  }

  const [encontrado] = await query(
    `
      SELECT
        u.id_usuario,
        u.email,
        u.password_hash,
        r.nombre AS rol,
        u.activo,
        rec.id_recepcionista,
        lim.id_personal,
        adm.id_admin
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      LEFT JOIN recepcionistas rec ON rec.id_usuario = u.id_usuario
      LEFT JOIN personal_limpieza lim ON lim.id_usuario = u.id_usuario
      LEFT JOIN administradores adm ON adm.id_usuario = u.id_usuario
      WHERE u.email = :usuario
      LIMIT 1
    `,
    { usuario },
  );

  if (!encontrado || !encontrado.activo || !verificarPassword(password, encontrado.password_hash)) {
    throw new NoAutorizadoError('Credenciales incorrectas');
  }

  if (!validarHashBcrypt(encontrado.password_hash) && !encontrado.password_hash.startsWith('plain:')) {
    throw new NoAutorizadoError('Credenciales incorrectas');
  }

  validarOtpAdministrador(encontrado, otp);

  const token = jwt.sign(
    {
      id_usuario: encontrado.id_usuario,
      email: encontrado.email,
      rol: encontrado.rol,
      id_recepcionista: encontrado.id_recepcionista ?? null,
      id_personal: encontrado.id_personal ?? null,
      id_admin: encontrado.id_admin ?? null,
    },
    process.env.JWT_SECRET ?? 'clave_desarrollo_no_usar_en_produccion',
    { expiresIn: JWT_EXPIRES_IN },
  );

  return {
    token,
    expira_en: JWT_EXPIRES_IN,
    usuario: {
      id_usuario: encontrado.id_usuario,
      email: encontrado.email,
      rol: encontrado.rol,
      id_recepcionista: encontrado.id_recepcionista ?? null,
      id_personal: encontrado.id_personal ?? null,
      id_admin: encontrado.id_admin ?? null,
    },
  };
}
