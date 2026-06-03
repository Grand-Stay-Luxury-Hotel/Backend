import { ParametrosInvalidosError } from './errors.js';

export const CATEGORIAS_AMBIENTALES = Object.freeze([
  'basura',
  'contaminacion_hidrica',
  'deforestacion',
  'vertidos_ilegales',
  'humo_quemas',
  'contaminacion_aire',
  'mineria_ilegal',
  'fauna_flora',
  'otro',
]);

const CATEGORIAS_AMBIENTALES_SET = new Set(CATEGORIAS_AMBIENTALES);

export const ALIASES_CATEGORIAS_AMBIENTALES = Object.freeze({
  agua: 'contaminacion_hidrica',
  contaminacion_agua: 'contaminacion_hidrica',
  contaminacion_del_agua: 'contaminacion_hidrica',
  contaminacion_hidrica: 'contaminacion_hidrica',
  aire: 'contaminacion_aire',
  contaminacion_atmosferica: 'contaminacion_aire',
  contaminacion_del_aire: 'contaminacion_aire',
  incendios_forestales: 'humo_quemas',
  incendio_forestal: 'humo_quemas',
  quema: 'humo_quemas',
  quemas: 'humo_quemas',
  humo: 'humo_quemas',
  tala: 'deforestacion',
  tala_arboles: 'deforestacion',
  tala_de_arboles: 'deforestacion',
  residuos: 'basura',
  residuos_solidos: 'basura',
  desechos: 'basura',
  vertidos: 'vertidos_ilegales',
  vertimiento: 'vertidos_ilegales',
  vertimientos: 'vertidos_ilegales',
  mineria: 'mineria_ilegal',
  fauna: 'fauna_flora',
  flora: 'fauna_flora',
  biodiversidad: 'fauna_flora',
  suelo: 'otro',
  ruido: 'otro',
  luminica: 'otro',
  deslizamientos: 'otro',
  avalanchas_fluviotorrenciales: 'otro',
  otros: 'otro',
});

export function limpiarCategoriaAmbiental(categoria) {
  return String(categoria ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizarCategoriaAmbiental(categoria, { permitirVacia = false } = {}) {
  const normalizada = limpiarCategoriaAmbiental(categoria);

  if (!normalizada) {
    if (permitirVacia) return null;
    throw new ParametrosInvalidosError('categoria ambiental es obligatoria', {
      categorias_validas: CATEGORIAS_AMBIENTALES,
    });
  }

  const canonica = ALIASES_CATEGORIAS_AMBIENTALES[normalizada] ?? normalizada;
  if (!CATEGORIAS_AMBIENTALES_SET.has(canonica)) {
    throw new ParametrosInvalidosError('categoria ambiental invalida', {
      categoria,
      categorias_validas: CATEGORIAS_AMBIENTALES,
    });
  }

  return canonica;
}

export function esCategoriaAmbientalValida(categoria) {
  try {
    normalizarCategoriaAmbiental(categoria);
    return true;
  } catch {
    return false;
  }
}
