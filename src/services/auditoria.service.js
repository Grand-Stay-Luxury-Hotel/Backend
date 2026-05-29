// src/services/auditoria.service.js
import crypto from 'crypto';
import { logAudit } from '../middleware/audit.middleware.js';
import { query } from '../utils/db.js';
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

function normalizarLimite(limite = 50) {
  const valor = Number(limite);
  if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
    throw new ParametrosInvalidosError('El limite debe ser un numero entero entre 1 y 100');
  }
  return valor;
}

function normalizarPagina(pagina = 1) {
  const valor = Number(pagina);
  if (!Number.isInteger(valor) || valor < 1) {
    throw new ParametrosInvalidosError('La pagina debe ser un numero entero mayor o igual a uno');
  }
  return valor;
}

export async function listarAuditoria({ tabla = null, accion = null, usuario = null, pagina = 1, limite = 50 } = {}) {
  try {
    const paginaNormalizada = normalizarPagina(pagina);
    const limiteNormalizado = normalizarLimite(limite);
    const offset = (paginaNormalizada - 1) * limiteNormalizado;
    const accionNormalizada = accion ? String(accion).trim().toUpperCase() : null;
    const tablaNormalizada = tabla ? String(tabla).trim() : null;
    const usuarioNormalizado = usuario ? Number(usuario) : null;

    const [{ total }] = await query(
      `
        SELECT COUNT(*) AS total
        FROM log_auditoria
        WHERE (:tabla IS NULL OR tabla_afectada = :tabla)
          AND (:accion IS NULL OR accion = :accion)
          AND (:usuario IS NULL OR id_usuario = :usuario)
      `,
      { tabla: tablaNormalizada, accion: accionNormalizada, usuario: usuarioNormalizado },
    );

    const registros = await query(
      `
        SELECT
          id_log AS id_auditoria,
          id_usuario,
          accion,
          tabla_afectada,
          id_registro,
          valor_anterior,
          valor_nuevo,
          ip,
          user_agent,
          fecha_hora
        FROM log_auditoria
        WHERE (:tabla IS NULL OR tabla_afectada = :tabla)
          AND (:accion IS NULL OR accion = :accion)
          AND (:usuario IS NULL OR id_usuario = :usuario)
        ORDER BY fecha_hora DESC, id_log DESC
        LIMIT ${limiteNormalizado} OFFSET ${offset}
      `,
      { tabla: tablaNormalizada, accion: accionNormalizada, usuario: usuarioNormalizado },
    );

    return { data: registros, total, pagina: paginaNormalizada, limite: limiteNormalizado };
  } catch (error) {
    throw error;
  }
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
