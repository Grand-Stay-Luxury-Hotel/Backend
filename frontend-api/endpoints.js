export const API_BASE_URL = 'http://localhost:4000';

export const authHeaderExample = {
  Authorization: 'Bearer <token>',
};

export const endpoints = {
  health: {
    check: { method: 'GET', path: '/health', auth: false },
  },

  auth: {
    login: { method: 'POST', path: '/auth/login', auth: false },
    registro: { method: 'POST', path: '/auth/registro', auth: false },
  },

  huespedes: {
    buscar: { method: 'GET', path: '/huespedes', auth: true, roles: ['Recepcionista', 'Administrador'] },
  },

  habitaciones: {
    listar: { method: 'GET', path: '/habitaciones', auth: true, roles: ['Recepcionista', 'Administrador', 'PersonalLimpieza'] },
    disponibilidad: { method: 'GET', path: '/habitaciones/disponibilidad', auth: true, roles: ['Recepcionista', 'Huesped'] },
    cambiarEstado: { method: 'PATCH', path: '/habitaciones/:id/estado', auth: true, roles: ['PersonalLimpieza', 'Recepcionista', 'Administrador'] },
  },

  reservas: {
    listar: { method: 'GET', path: '/reservas', auth: true, roles: ['Recepcionista', 'Administrador'] },
    crear: { method: 'POST', path: '/reservas', auth: true, roles: ['Recepcionista', 'Huesped'] },
    cancelar: { method: 'DELETE', path: '/reservas/:id', auth: true, roles: ['Recepcionista', 'Administrador'] },
  },

  checkin: {
    registrar: { method: 'POST', path: '/checkin/:reservaId', auth: true, roles: ['Recepcionista'] },
  },

  checkout: {
    registrar: { method: 'POST', path: '/checkout/:reservaId', auth: true, roles: ['Recepcionista'] },
  },

  consumos: {
    registrar: { method: 'POST', path: '/consumos', auth: true, roles: ['Recepcionista'] },
  },

  inventario: {
    registrarConsumo: { method: 'POST', path: '/inventario/consumo', auth: true, roles: ['Administrador', 'PersonalLimpieza'] },
    listarAlertas: { method: 'GET', path: '/inventario/alertas', auth: true, roles: ['Administrador'] },
    actualizarUmbral: { method: 'PATCH', path: '/inventario/:id/umbral', auth: true, roles: ['Administrador'] },
  },

  reportes: {
    ocupacion: { method: 'GET', path: '/reportes/ocupacion', auth: true, roles: ['Administrador'] },
    ingresos: { method: 'GET', path: '/reportes/ingresos', auth: true, roles: ['Administrador'] },
  },
};

export function buildPath(path, params = {}) {
  return Object.entries(params).reduce(
    (resolvedPath, [key, value]) => resolvedPath.replace(`:${key}`, encodeURIComponent(String(value))),
    path,
  );
}
