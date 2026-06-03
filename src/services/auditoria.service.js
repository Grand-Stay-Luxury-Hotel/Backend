// src/services/auditoria.service.js
import crypto from 'crypto';
import { logAudit } from '../middleware/audit.middleware.js';
import { query } from '../utils/db.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

export const ACCIONES_AUDITORIA_VALIDAS = new Set(['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'READ']);
export const TABLAS_AUDITORIA_VALIDAS = new Set([
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

export async function listarFiltrosAuditoria() {
  const [tablasRegistradas, usuarios] = await Promise.all([
    query(
      `
        SELECT DISTINCT tabla_afectada AS tabla
        FROM log_auditoria
        WHERE tabla_afectada IS NOT NULL
        ORDER BY tabla_afectada
      `,
    ),
    query(
      `
        SELECT
          u.id_usuario,
          u.email,
          u.nombre,
          u.apellido,
          r.nombre AS rol
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        ORDER BY u.id_usuario
      `,
    ),
  ]);

  const tablas = Array.from(new Set([
    ...tablasRegistradas.map((r) => r.tabla).filter(Boolean),
    ...TABLAS_AUDITORIA_VALIDAS,
  ])).sort();

  return {
    acciones: Array.from(ACCIONES_AUDITORIA_VALIDAS).sort(),
    tablas,
    usuarios: usuarios.map((u) => ({
      id_usuario: u.id_usuario,
      email: u.email,
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.email,
      rol: u.rol,
    })),
  };
}

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
          la.id_log AS id_auditoria,
          la.id_usuario,
          u.email AS usuario,
          CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, '')) AS nombre_usuario,
          r.nombre AS rol_usuario,
          la.accion,
          la.tabla_afectada,
          la.id_registro,
          la.valor_anterior,
          la.valor_nuevo,
          la.ip,
          la.user_agent,
          la.fecha_hora
        FROM log_auditoria la
        LEFT JOIN usuarios u ON u.id_usuario = la.id_usuario
        LEFT JOIN roles r ON r.id_rol = u.id_rol
        WHERE (:tabla IS NULL OR la.tabla_afectada = :tabla)
          AND (:accion IS NULL OR la.accion = :accion)
          AND (:usuario IS NULL OR la.id_usuario = :usuario)
        ORDER BY la.fecha_hora DESC, la.id_log DESC
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
