// src/middleware/audit.middleware.js
import crypto from 'crypto';
import { pool } from '../utils/db.js';

function crearHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function sanitizarValorAuditoria(valor) {
  if (valor === null || valor === undefined) return valor;
  if (Array.isArray(valor)) return valor.map((item) => sanitizarValorAuditoria(item));
  if (typeof valor !== 'object') return valor;

  const camposSensibles = new Set(['authorization', 'password', 'password_hash', 'token', 'token_pago']);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, contenido]) => [
      clave,
      camposSensibles.has(clave.toLowerCase()) ? '[REDACTADO]' : sanitizarValorAuditoria(contenido),
    ]),
  );
}

export async function logAudit({
  conn = null,
  userId = null,
  accion = 'UPDATE',
  tablaAfectada,
  idRegistro = null,
  valorAnterior = null,
  valorNuevo = null,
  ip = null,
  userAgent = null,
}) {
  const timestamp = new Date().toISOString();
  const valorAnteriorSanitizado = sanitizarValorAuditoria(valorAnterior);
  const valorNuevoSanitizado = sanitizarValorAuditoria(valorNuevo);
  const hashIntegridad = crearHash({
    userId,
    accion,
    tablaAfectada,
    idRegistro,
    valorAnterior: valorAnteriorSanitizado,
    valorNuevo: valorNuevoSanitizado,
    timestamp,
  });
  const datosNuevos = {
    ...(valorNuevoSanitizado ?? {}),
    timestamp_auditoria: timestamp,
    hash_integridad: hashIntegridad,
    repositorio_integridad: {
      nombre: 'log_auditoria_hash_chain',
      modo: 'solo_insercion',
      hash_sha256: hashIntegridad,
    },
  };

  const sql = `
    INSERT INTO log_auditoria
      (id_usuario, tabla_afectada, accion, id_registro, valor_anterior, valor_nuevo, ip, user_agent)
    VALUES
      (:userId, :tablaAfectada, :accion, :idRegistro, :valorAnterior, :valorNuevo, :ip, :userAgent)
  `;
  const params = {
    userId,
    tablaAfectada,
    accion,
    idRegistro,
    valorAnterior: valorAnteriorSanitizado === null ? null : JSON.stringify(valorAnteriorSanitizado),
    valorNuevo: JSON.stringify(datosNuevos),
    ip,
    userAgent,
  };

  if (conn) {
    await conn.execute(sql, params);
    return { hash_integridad: hashIntegridad, timestamp };
  }

  await pool.execute(sql, params);
  return { hash_integridad: hashIntegridad, timestamp };
}
