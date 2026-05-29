// src/services/auditoria.service.js
import crypto from 'crypto';
import { logAudit } from '../middleware/audit.middleware.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

const ACCIONES_AUDITORIA_VALIDAS = new Set(['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'READ']);
const TABLAS_AUDITORIA_VALIDAS = new Set([
  'auth',
  'checkin',
  'checkout',
  'consumo_insumos',
  'consumo_servicios',
  'facturas',
  'habitaciones',
  'insumos_limpieza',
  'inventario',
  'log_auditoria',
  'notificaciones',
  'reportes',
  'reservas',
  'tokens_pago',
  'usuarios',
]);

export function crearHashAuditoria(registro) {
  return crypto.createHash('sha256').update(JSON.stringify(registro)).digest('hex');
}

export function validarRegistroAuditoria({ accion, tablaAfectada }) {
  if (!accion || !tablaAfectada) {
    throw new ParametrosInvalidosError('accion y tablaAfectada son obligatorios');
  }

  const accionNormalizada = String(accion).trim().toUpperCase();
  const tablaNormalizada = String(tablaAfectada).trim();

  if (!ACCIONES_AUDITORIA_VALIDAS.has(accionNormalizada)) {
    throw new ParametrosInvalidosError('accion de auditoria no valida');
  }

  if (!TABLAS_AUDITORIA_VALIDAS.has(tablaNormalizada)) {
    throw new ParametrosInvalidosError('tablaAfectada de auditoria no valida');
  }

  return true;
}

export function obtenerPoliticaAuditoria() {
  return {
    tabla: 'log_auditoria',
    modo: 'solo_insercion',
    operaciones_bloqueadas: ['UPDATE', 'DELETE'],
    repositorio_integridad: 'log_auditoria_hash_chain',
    algoritmo_hash: 'SHA-256',
  };
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
