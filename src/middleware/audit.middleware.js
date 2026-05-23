// src/middleware/audit.middleware.js
import crypto from 'crypto';
import { pool } from '../utils/db.js';

function crearHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
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
  const hashIntegridad = crearHash({
    userId,
    accion,
    tablaAfectada,
    idRegistro,
    valorAnterior,
    valorNuevo,
    timestamp,
  });
  const datosNuevos = {
    ...(valorNuevo ?? {}),
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
      (id_usuario, tabla_afectada, accion, id_registro, datos_anteriores, datos_nuevos, ip_origen, user_agent)
    VALUES
      (:userId, :tablaAfectada, :accion, :idRegistro, :valorAnterior, :valorNuevo, :ip, :userAgent)
  `;
  const params = {
    userId,
    tablaAfectada,
    accion,
    idRegistro,
    valorAnterior: valorAnterior === null ? null : JSON.stringify(valorAnterior),
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
