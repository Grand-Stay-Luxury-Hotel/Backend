// src/services/auth.service.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, getConnection } from '../utils/db.js';
import { AccesoDenegadoError, NoAutorizadoError, ParametrosInvalidosError } from '../utils/errors.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';

export function validarHashBcrypt(passwordHash) {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(passwordHash ?? '');
  if (!match) return false;
  return Number(match[1]) >= 12;
}

function validarHashSha256(passwordHash) {
  return /^[a-f0-9]{64}$/i.test(passwordHash ?? '');
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
        adm.id_admin,
        hue.id_huesped
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      LEFT JOIN recepcionistas rec ON rec.id_usuario = u.id_usuario
      LEFT JOIN personal_limpieza lim ON lim.id_usuario = u.id_usuario
      LEFT JOIN administradores adm ON adm.id_usuario = u.id_usuario
      LEFT JOIN huespedes hue ON hue.id_usuario = u.id_usuario
      WHERE u.email = :usuario
      LIMIT 1
    `,
    { usuario },
  );

  if (!encontrado || !encontrado.activo || !verificarPassword(password, encontrado.password_hash)) {
    throw new NoAutorizadoError('Credenciales incorrectas');
  }

  if (!validarHashBcrypt(encontrado.password_hash) && !encontrado.password_hash.startsWith('plain:') && !validarHashSha256(encontrado.password_hash)) {
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
      id_huesped: encontrado.id_huesped ?? null,
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
      id_huesped: encontrado.id_huesped ?? null,
    },
  };
}

/* istanbul ignore next */
export async function registro({ nombre, apellido, email, password, telefono, num_documento }) {
  if (!nombre?.trim() || !apellido?.trim() || !email?.trim() || !password) {
    throw new ParametrosInvalidosError('nombre, apellido, email y password son obligatorios');
  }

  if (!num_documento?.trim()) {
    throw new ParametrosInvalidosError('El número de documento es obligatorio');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ParametrosInvalidosError('El formato del email no es válido');
  }

  if (password.length < 8) {
    throw new ParametrosInvalidosError('La contraseña debe tener al menos 8 caracteres');
  }

  const emailNorm = email.trim().toLowerCase();

  const existentes = await query(
    'SELECT id_usuario FROM usuarios WHERE email = :email LIMIT 1',
    { email: emailNorm },
  );
  if (existentes.length > 0) {
    throw new ParametrosInvalidosError('El email ya está registrado');
  }

  const roles = await query(
    "SELECT id_rol FROM roles WHERE nombre = 'Huesped' LIMIT 1",
  );
  if (roles.length === 0) {
    throw new ParametrosInvalidosError('Rol de huésped no configurado en el sistema');
  }
  const id_rol = roles[0].id_rol;

  const password_hash = await bcrypt.hash(password, 12);

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [usuarioResult] = await conn.execute(
      'INSERT INTO usuarios (nombre, apellido, email, password_hash, id_rol, activo) VALUES (:nombre, :apellido, :email, :password_hash, :id_rol, TRUE)',
      { nombre: nombre.trim(), apellido: apellido.trim(), email: emailNorm, password_hash, id_rol },
    );
    const id_usuario = usuarioResult.insertId;

    const [huespedResult] = await conn.execute(
      `INSERT INTO huespedes (id_usuario, nombres, apellidos, email, num_documento, telefono)
       VALUES (:id_usuario, :nombres, :apellidos, :email, :num_documento, :telefono)`,
      {
        id_usuario,
        nombres: nombre.trim(),
        apellidos: apellido.trim(),
        email: emailNorm,
        num_documento: num_documento.trim(),
        telefono: telefono?.trim() ?? null,
      },
    );
    const id_huesped = huespedResult.insertId;

    await conn.commit();

    const token = jwt.sign(
      {
        id_usuario,
        email: emailNorm,
        rol: 'Huesped',
        id_recepcionista: null,
        id_personal: null,
        id_admin: null,
        id_huesped,
      },
      process.env.JWT_SECRET ?? 'clave_desarrollo_no_usar_en_produccion',
      { expiresIn: JWT_EXPIRES_IN },
    );

    return {
      token,
      expira_en: JWT_EXPIRES_IN,
      usuario: {
        id_usuario,
        email: emailNorm,
        rol: 'Huesped',
        id_recepcionista: null,
        id_personal: null,
        id_admin: null,
        id_huesped,
      },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
