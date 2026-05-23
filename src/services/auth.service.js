// src/services/auth.service.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../utils/db.js';
import { AccesoDenegadoError, NoAutorizadoError, ParametrosInvalidosError } from '../utils/errors.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';
const TOTP_INTERVAL_SECONDS = 30;
const TOTP_WINDOW = 1;

export function validarHashBcrypt(passwordHash) {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(passwordHash ?? '');
  if (!match) return false;
  return Number(match[1]) >= 12;
}

function validarHashSha256(passwordHash) {
  return /^[a-f0-9]{64}$/i.test(passwordHash ?? '');
}

function permiteHashesLegacy() {
  return process.env.ALLOW_LEGACY_PASSWORD_HASHES === 'true';
}

function decodificarBase32(secret) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const limpio = String(secret ?? '').replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const caracter of limpio) {
    const valor = alfabeto.indexOf(caracter);
    if (valor < 0) return Buffer.from(secret ?? '');
    bits += valor.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generarTotp(secret, fecha = new Date()) {
  const contador = Math.floor(fecha.getTime() / 1000 / TOTP_INTERVAL_SECONDS);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(contador));
  const hmac = crypto.createHmac('sha1', decodificarBase32(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codigo = (
    ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return String(codigo).padStart(6, '0');
}

export function validarTotp(secret, otp, fecha = new Date()) {
  if (!secret || !otp) return false;
  const recibido = String(otp).padStart(6, '0');
  for (let ventana = -TOTP_WINDOW; ventana <= TOTP_WINDOW; ventana += 1) {
    const fechaVentana = new Date(fecha.getTime() + ventana * TOTP_INTERVAL_SECONDS * 1000);
    if (generarTotp(secret, fechaVentana) === recibido) return true;
  }
  return false;
}

export function verificarPassword(password, passwordHash) {
  if (!password || !passwordHash) return false;

  if (!validarHashBcrypt(passwordHash) && !permiteHashesLegacy()) {
    return false;
  }

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

  if (validarHashSha256(passwordHash)) {
    const esperado = Buffer.from(passwordHash, 'hex');
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
  const totpSecret = usuario.otp_secret ?? process.env.ADMIN_OTP_SECRET;
  const otpEstatico = process.env.ADMIN_OTP;
  const otpValido = totpSecret
    ? validarTotp(totpSecret, otp)
    : Boolean(otpEstatico && otp === otpEstatico);

  if (!otpValido) {
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

  if (!validarHashBcrypt(encontrado.password_hash) && !permiteHashesLegacy()) {
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
