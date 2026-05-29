// src/services/servicios.service.js
import { query } from '../utils/db.js';

export async function listarServiciosAdicionales({ categoria = null, soloDisponibles = true } = {}) {
  try {
    const servicios = await query(
      `
        SELECT
          id_servicio,
          nombre,
          categoria,
          precio,
          activo,
          disponible
        FROM servicios_adicionales
        WHERE (:categoria IS NULL OR categoria = :categoria)
          AND (:soloDisponibles = FALSE OR (activo = TRUE AND disponible = TRUE))
        ORDER BY categoria, nombre
      `,
      {
        categoria: categoria ? String(categoria).trim().toLowerCase() : null,
        soloDisponibles: !['false', '0', 'no'].includes(String(soloDisponibles).toLowerCase()),
      },
    );

    return { data: servicios, total: servicios.length };
  } catch (error) {
    throw error;
  }
}
