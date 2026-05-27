export const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:4000';

export const authHeaderExample = {
  Authorization: 'Bearer <jwt_token>',
};

export const endpoints = {
  health: {
    status: {
      method: 'GET',
      path: '/health',
      requiresAuth: false,
      description: 'Verifica que el backend este activo.',
    },
  },

  auth: {
    login: {
      method: 'POST',
      path: '/auth/login',
      requiresAuth: false,
      bodyExample: {
        usuario: 'recep1@grandstay.com',
        password: '<password>',
        otp: '<otp_solo_admin>',
      },
      description: 'Inicia sesion y devuelve un token JWT.',
    },
  },

  usuarios: {
    implemented: false,
    description: 'No identificado en el backend actual: no hay rutas publicadas para usuarios.',
  },

  habitaciones: {
    disponibilidad: {
      method: 'GET',
      path: '/habitaciones/disponibilidad',
      requiresAuth: true,
      allowedRoles: ['Recepcionista', 'Huesped'],
      queryParams: ['fechaEntrada', 'fechaSalida', 'tipo', 'capacidad'],
      queryExample: {
        fechaEntrada: '2026-12-10',
        fechaSalida: '2026-12-12',
        tipo: 'Deluxe',
        capacidad: 2,
      },
      headersExample: authHeaderExample,
      description: 'Consulta habitaciones disponibles por fecha, tipo y capacidad.',
    },
    actualizarEstado: {
      method: 'PATCH',
      path: '/habitaciones/:id/estado',
      requiresAuth: true,
      allowedRoles: ['PersonalLimpieza', 'Recepcionista', 'Administrador'],
      pathParams: ['id'],
      bodyExample: {
        estado: 'limpieza',
        observaciones: 'Habitacion lista para limpieza',
      },
      headersExample: authHeaderExample,
      description: 'Actualiza el estado operativo de una habitacion.',
    },
  },

  reservas: {
    crear: {
      method: 'POST',
      path: '/reservas',
      requiresAuth: true,
      allowedRoles: ['Recepcionista', 'Huesped'],
      bodyExample: {
        id_huesped: 1,
        id_habitacion: 1,
        fecha_entrada: '2026-12-10',
        fecha_salida: '2026-12-12',
        token_pago: '<payment_token>',
        monto_anticipo: 250000,
        observaciones: 'Llegada tarde',
      },
      headersExample: authHeaderExample,
      description: 'Crea una reserva con anticipo y validacion de disponibilidad.',
    },
    cancelar: {
      method: 'DELETE',
      path: '/reservas/:id',
      requiresAuth: true,
      allowedRoles: ['Recepcionista', 'Administrador'],
      pathParams: ['id'],
      headersExample: authHeaderExample,
      description: 'Cancela una reserva y calcula penalizacion.',
    },
  },

  checkin: {
    registrar: {
      method: 'POST',
      path: '/checkin/:reservaId',
      requiresAuth: true,
      allowedRoles: ['Recepcionista'],
      pathParams: ['reservaId'],
      bodyExample: {
        documento_verificado: true,
        observaciones: 'Documento validado en recepcion',
      },
      headersExample: authHeaderExample,
      description: 'Registra el check-in de una reserva confirmada.',
    },
  },

  checkout: {
    registrar: {
      method: 'POST',
      path: '/checkout/:reservaId',
      requiresAuth: true,
      allowedRoles: ['Recepcionista'],
      pathParams: ['reservaId'],
      bodyExample: {
        observaciones: 'Salida sin novedades',
      },
      headersExample: authHeaderExample,
      description: 'Procesa check-out, liquidacion y factura.',
    },
  },

  consumos: {
    registrar: {
      method: 'POST',
      path: '/consumos',
      requiresAuth: true,
      allowedRoles: ['Recepcionista'],
      bodyExample: {
        habitacionId: 101,
        tipo: 'restaurante',
        descripcion: 'Cena habitacion',
        cantidad: 1,
        precio_unitario: 85000,
      },
      headersExample: authHeaderExample,
      description: 'Registra consumos adicionales de una habitacion ocupada.',
    },
  },

  mantenimiento: {
    cambiarEstadoHabitacion: {
      method: 'PATCH',
      path: '/habitaciones/:id/estado',
      requiresAuth: true,
      allowedRoles: ['Recepcionista', 'Administrador'],
      pathParams: ['id'],
      bodyExample: {
        estado: 'mantenimiento',
        observaciones: 'Revision tecnica requerida',
      },
      headersExample: authHeaderExample,
      description: 'El mantenimiento se maneja actualmente como estado de habitacion.',
    },
  },

  inventario: {
    registrarConsumo: {
      method: 'POST',
      path: '/inventario/consumo',
      requiresAuth: true,
      allowedRoles: ['Administrador', 'PersonalLimpieza'],
      bodyExample: {
        insumoId: 1,
        habitacionId: 101,
        cantidad: 2,
        tipoTarea: 'limpieza_rutina',
        observaciones: 'Reposicion de amenidades',
      },
      headersExample: authHeaderExample,
      description: 'Registra consumo de insumos de limpieza.',
    },
    alertas: {
      method: 'GET',
      path: '/inventario/alertas',
      requiresAuth: true,
      allowedRoles: ['Administrador'],
      headersExample: authHeaderExample,
      description: 'Lista alertas pendientes de stock critico.',
    },
    actualizarUmbral: {
      method: 'PATCH',
      path: '/inventario/:id/umbral',
      requiresAuth: true,
      allowedRoles: ['Administrador'],
      pathParams: ['id'],
      bodyExample: {
        umbral: 10,
      },
      headersExample: authHeaderExample,
      description: 'Actualiza el stock minimo de un insumo.',
    },
  },

  reportes: {
    ocupacion: {
      method: 'GET',
      path: '/reportes/ocupacion',
      requiresAuth: true,
      allowedRoles: ['Administrador'],
      queryParams: ['mes', 'anio', 'meses'],
      queryExample: {
        mes: 5,
        anio: 2026,
        meses: 1,
      },
      headersExample: authHeaderExample,
      description: 'Obtiene reporte de ocupacion.',
    },
    ingresos: {
      method: 'GET',
      path: '/reportes/ingresos',
      requiresAuth: true,
      allowedRoles: ['Administrador'],
      queryParams: ['mes', 'anio', 'meses', 'fechaInicio', 'fechaFin'],
      queryExample: {
        mes: 5,
        anio: 2026,
        meses: 1,
      },
      headersExample: authHeaderExample,
      description: 'Obtiene reporte de ingresos.',
    },
  },

  auditoria: {
    implemented: false,
    description: 'No identificado en el backend actual: hay registro interno en log_auditoria, pero no hay endpoint publico.',
  },
};

export function buildUrl(path, params = {}, query = {}) {
  let resolvedPath = path;
  Object.entries(params).forEach(([key, value]) => {
    resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
  });

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return `${API_BASE_URL}${resolvedPath}${queryString ? `?${queryString}` : ''}`;
}
