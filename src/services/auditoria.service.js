// src/services/auditoria.service.js
import crypto from 'crypto';
import { logAudit } from '../middleware/audit.middleware.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

export function crearHashAuditoria(registro) {
  return crypto.createHash('sha256').update(JSON.stringify(registro)).digest('hex');
}

export function validarRegistroAuditoria({ accion, tablaAfectada }) {
  if (!accion || !tablaAfectada) {
    throw new ParametrosInvalidosError('accion y tablaAfectada son obligatorios');
  }
  return true;
}

/* istanbul ignore next */
export async function registrarOperacionCritica(registro) {
  validarRegistroAuditoria(registro);
  await logAudit({
    userId: registro.userId ?? null,
    accion: registro.accion,
    tablaAfectada: registro.tablaAfectada,
    idRegistro: registro.idRegistro ?? null,
    valorAnterior: registro.valorAnterior ?? null,
    valorNuevo: {
      ...(registro.valorNuevo ?? {}),
      hash_repositorio_externo: crearHashAuditoria(registro),
    },
    ip: registro.ip ?? null,
    userAgent: registro.userAgent ?? null,
  });
  return { mensaje: 'Operacion critica auditada' };
}
