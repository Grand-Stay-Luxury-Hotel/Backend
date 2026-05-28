// src/services/huespedes.service.js
import { query } from '../utils/db.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

function normalizarLimite(limite = 20) {
  const valor = Number(limite);
  if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
    throw new ParametrosInvalidosError('El limite debe ser un numero entero entre 1 y 100');
  }
  return valor;
}

function normalizarBusqueda(buscar = '') {
  const valor = String(buscar ?? '').trim();
  return valor.length > 0 ? `%${valor}%` : null;
}

export async function buscarHuespedes({ buscar = '', limite = 20 } = {}) {
  try {
    const limiteNormalizado = normalizarLimite(limite);
    const patronBusqueda = normalizarBusqueda(buscar);

    const huespedes = await query(
      `
        SELECT
          h.id_huesped,
          h.id_usuario,
          h.nombres,
          h.apellidos,
          CONCAT(h.nombres, ' ', h.apellidos) AS nombre_completo,
          h.email,
          h.num_documento,
          h.telefono
        FROM huespedes h
        WHERE
          :buscar IS NULL
          OR h.nombres LIKE :buscar
          OR h.apellidos LIKE :buscar
          OR CONCAT(h.nombres, ' ', h.apellidos) LIKE :buscar
          OR h.email LIKE :buscar
          OR h.num_documento LIKE :buscar
        ORDER BY h.apellidos, h.nombres
        LIMIT :limite
      `,
      { buscar: patronBusqueda, limite: limiteNormalizado },
    );

    return {
      data: huespedes,
      total: huespedes.length,
      mensaje: huespedes.length === 0 ? 'No se encontraron huespedes con los criterios indicados' : undefined,
    };
  } catch (error) {
    throw error;
  }
}
