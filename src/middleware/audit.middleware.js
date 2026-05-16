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
  try {
    const datosNuevos = {
      ...(valorNuevo ?? {}),
      hash_integridad: crearHash({
        userId,
        accion,
        tablaAfectada,
        idRegistro,
        valorAnterior,
        valorNuevo,
        timestamp: new Date().toISOString(),
      }),
    };

    const sql = `
      INSERT INTO log_auditoria
        (id_usuario, tabla_afectada, accion, id_registro, datos_anteriores, datos_nuevos, ip_origen, user_agent)
      VALUES
        (:userId, :tablaAfectada, :accion, :idRegistro, CAST(:valorAnterior AS JSON), CAST(:valorNuevo AS JSON), :ip, :userAgent)
    `;
    const params = {
      userId,
      tablaAfectada,
      accion,
      idRegistro,
      valorAnterior: JSON.stringify(valorAnterior),
      valorNuevo: JSON.stringify(datosNuevos),
      ip,
      userAgent,
    };

    if (conn) {
      await conn.execute(sql, params);
      return;
    }

    await pool.execute(sql, params);
  } catch (error) {
    console.error('No fue posible registrar auditoría:', error.message);
  }
}
