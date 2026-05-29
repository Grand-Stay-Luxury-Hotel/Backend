import swaggerJSDoc from 'swagger-jsdoc';

const bearerAuth = [{ bearerAuth: [] }];

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Grand-Stay Backend API',
      version: '1.0.0',
      description: 'Documentacion OpenAPI para los endpoints backend de Grand-Stay.',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Servidor local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            codigo: { type: 'string', example: 'PARAMETROS_INVALIDOS' },
            mensaje: { type: 'string', example: 'Solicitud invalida' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['usuario', 'password'],
          properties: {
            usuario: { type: 'string', format: 'email', example: 'recep1@grandstay.com' },
            password: { type: 'string', example: 'ClaveSegura123*' },
            otp: { type: 'string', example: '123456' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            expira_en: { type: 'string', example: '8h' },
            usuario: { type: 'object' },
          },
        },
        RegistroRequest: {
          type: 'object',
          required: ['nombre', 'apellido', 'email', 'password', 'num_documento'],
          properties: {
            nombre: { type: 'string', example: 'Juan' },
            apellido: { type: 'string', example: 'Garcia' },
            email: { type: 'string', format: 'email', example: 'juan@email.com' },
            password: { type: 'string', minLength: 8, example: 'Minimo8chars' },
            telefono: { type: 'string', example: '+57 300 000 0000' },
            num_documento: { type: 'string', example: '1234567890' },
          },
        },
        ReservaRequest: {
          type: 'object',
          required: ['id_huesped', 'id_habitacion', 'fecha_entrada', 'fecha_salida', 'token_pago', 'monto_anticipo'],
          properties: {
            id_huesped: { type: 'integer', example: 1 },
            id_habitacion: { type: 'integer', example: 1 },
            fecha_entrada: { type: 'string', format: 'date', example: '2026-12-10' },
            fecha_salida: { type: 'string', format: 'date', example: '2026-12-12' },
            token_pago: { type: 'string', example: 'tok_test_123' },
            monto_anticipo: { type: 'number', example: 250000 },
            observaciones: { type: 'string', example: 'Llegada tarde' },
          },
        },
        EstadoHabitacionRequest: {
          type: 'object',
          required: ['estado'],
          properties: {
            estado: {
              type: 'string',
              enum: ['disponible', 'ocupada', 'mantenimiento', 'limpieza', 'bloqueada'],
              example: 'limpieza',
            },
            observaciones: { type: 'string', example: 'Habitacion lista para limpieza' },
          },
        },
        CheckinRequest: {
          type: 'object',
          properties: {
            documento_verificado: { type: 'boolean', example: true },
            observaciones: { type: 'string', example: 'Documento verificado en recepcion' },
          },
        },
        CheckoutRequest: {
          type: 'object',
          properties: {
            estado_habitacion: {
              type: 'string',
              enum: ['bueno', 'danos_menores', 'danos_graves', 'pendiente_revision'],
              example: 'bueno',
            },
            estadoHabitacion: {
              type: 'string',
              enum: ['bueno', 'danos_menores', 'danos_graves', 'pendiente_revision'],
              example: 'bueno',
              description: 'Alias aceptado por el backend para estado_habitacion.',
            },
            observaciones: { type: 'string', example: 'Salida realizada correctamente' },
          },
        },
        ConsumoRequest: {
          type: 'object',
          required: ['habitacionId', 'tipo', 'descripcion', 'cantidad', 'precio_unitario'],
          properties: {
            habitacionId: { type: 'integer', example: 3 },
            tipo: { type: 'string', enum: ['restaurante', 'lavanderia', 'spa'], example: 'restaurante' },
            descripcion: { type: 'string', example: 'Cena habitacion' },
            cantidad: { type: 'number', example: 1 },
            precio_unitario: { type: 'number', example: 85000 },
          },
        },
        InventarioConsumoRequest: {
          type: 'object',
          required: ['insumoId', 'habitacionId', 'cantidad'],
          properties: {
            insumoId: { type: 'integer', example: 1 },
            habitacionId: { type: 'integer', example: 1 },
            idPersonal: { type: 'integer', example: 1 },
            cantidad: { type: 'number', example: 2 },
            tipoTarea: { type: 'string', example: 'limpieza_rutina' },
            observaciones: { type: 'string', example: 'Reposicion de amenidades' },
          },
        },
        UmbralInventarioRequest: {
          type: 'object',
          required: ['umbral'],
          properties: {
            umbral: { type: 'number', example: 10 },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'No autenticado o token invalido',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        Forbidden: {
          description: 'Rol sin permisos para ejecutar la accion',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        ValidationError: {
          description: 'Parametros invalidos',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
    tags: [
      { name: 'Salud' },
      { name: 'Autenticacion' },
      { name: 'Huespedes' },
      { name: 'Habitaciones' },
      { name: 'Reservas' },
      { name: 'Check-in' },
      { name: 'Check-out' },
      { name: 'Consumos' },
      { name: 'Inventario' },
      { name: 'Reportes', description: 'Reportes JSON. El valor pdf_trigger indica integracion pendiente, no generacion PDF directa.' },
      { name: 'Auditoria', description: 'Auditoria interna mediante middleware/servicio; no existe endpoint HTTP publico.' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Salud'],
          summary: 'Verifica que el backend este activo',
          responses: {
            200: {
              description: 'Backend activo',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      estado: { type: 'string', example: 'ok' },
                      mensaje: { type: 'string', example: 'Backend Grand-Stay activo' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Autenticacion'],
          summary: 'Inicia sesion y devuelve un JWT',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: {
              description: 'Sesion iniciada',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
            },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/auth/registro': {
        post: {
          tags: ['Autenticacion'],
          summary: 'Registra un nuevo huesped y devuelve un JWT',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistroRequest' } } },
          },
          responses: {
            201: {
              description: 'Huesped registrado',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
            },
            400: { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/habitaciones/disponibilidad': {
        get: {
          tags: ['Habitaciones'],
          summary: 'Consulta disponibilidad de habitaciones',
          security: bearerAuth,
          parameters: [
            { name: 'fechaEntrada', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-12-10' },
            { name: 'fechaSalida', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-12-12' },
            { name: 'tipo', in: 'query', schema: { type: 'string' }, example: 'Estándar' },
            { name: 'capacidad', in: 'query', schema: { type: 'integer' }, example: 2 },
          ],
          responses: {
            200: { description: 'Disponibilidad encontrada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/huespedes': {
        get: {
          tags: ['Huespedes'],
          summary: 'Busca huespedes para selectores del frontend',
          security: bearerAuth,
          parameters: [
            { name: 'buscar', in: 'query', schema: { type: 'string' }, example: 'Sofia' },
            { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, example: 20 },
          ],
          responses: {
            200: { description: 'Huespedes encontrados' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/habitaciones': {
        get: {
          tags: ['Habitaciones'],
          summary: 'Lista habitaciones para selectores y tableros operativos',
          security: bearerAuth,
          parameters: [
            { name: 'buscar', in: 'query', schema: { type: 'string' }, example: '201' },
            { name: 'estado', in: 'query', schema: { type: 'string', enum: ['disponible', 'ocupada', 'mantenimiento', 'limpieza', 'bloqueada'] }, example: 'ocupada' },
            { name: 'conReservaActiva', in: 'query', schema: { type: 'boolean' }, example: true },
            { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, example: 50 },
          ],
          responses: {
            200: { description: 'Habitaciones encontradas' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/habitaciones/{id}/estado': {
        patch: {
          tags: ['Habitaciones'],
          summary: 'Actualiza el estado de una habitacion, incluyendo mantenimiento',
          description: 'No existe una ruta separada de mantenimiento; se gestiona con estados de habitacion.',
          security: bearerAuth,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 2 }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/EstadoHabitacionRequest' } } },
          },
          responses: {
            200: { description: 'Estado actualizado' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/reservas': {
        get: {
          tags: ['Reservas'],
          summary: 'Lista reservas por codigo, huesped, documento o habitacion',
          security: bearerAuth,
          parameters: [
            { name: 'buscar', in: 'query', schema: { type: 'string' }, example: 'GS-2026' },
            { name: 'estado', in: 'query', schema: { type: 'string', enum: ['pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_show'] }, example: 'confirmada' },
            { name: 'operacion', in: 'query', schema: { type: 'string', enum: ['checkin', 'checkout', 'cancelacion'] }, example: 'checkin' },
            { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, example: 50 },
          ],
          responses: {
            200: { description: 'Reservas encontradas' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['Reservas'],
          summary: 'Crea una reserva con anticipo',
          description: 'Crear una reserva no marca la habitacion como ocupada; la ocupacion ocurre en check-in.',
          security: bearerAuth,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReservaRequest' } } },
          },
          responses: {
            201: { description: 'Reserva creada' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/reservas/{id}': {
        delete: {
          tags: ['Reservas'],
          summary: 'Cancela una reserva y calcula penalizacion',
          security: bearerAuth,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 2 }],
          responses: {
            200: { description: 'Reserva cancelada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { description: 'Reserva no encontrada' },
          },
        },
      },
      '/checkin/{reservaId}': {
        post: {
          tags: ['Check-in'],
          summary: 'Registra el check-in de una reserva',
          security: bearerAuth,
          parameters: [{ name: 'reservaId', in: 'path', required: true, schema: { type: 'integer' }, example: 2 }],
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckinRequest' } } },
          },
          responses: {
            200: { description: 'Check-in registrado. La reserva pasa a en_curso y la habitacion a ocupada.' },
            400: { $ref: '#/components/responses/ValidationError' },
            409: { description: 'La reserva ya tiene check-in registrado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { description: 'Reserva no encontrada' },
          },
        },
      },
      '/checkout/{reservaId}': {
        post: {
          tags: ['Check-out'],
          summary: 'Registra el check-out y genera liquidacion',
          security: bearerAuth,
          parameters: [{ name: 'reservaId', in: 'path', required: true, schema: { type: 'integer' }, example: 2 }],
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutRequest' } } },
          },
          responses: {
            200: { description: 'Check-out procesado. La reserva pasa a completada y la habitacion a limpieza.' },
            400: { $ref: '#/components/responses/ValidationError' },
            409: { description: 'La reserva ya tiene check-out registrado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { description: 'Reserva no encontrada' },
          },
        },
      },
      '/consumos': {
        post: {
          tags: ['Consumos'],
          summary: 'Registra consumos adicionales de una habitacion ocupada',
          security: bearerAuth,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ConsumoRequest' } } },
          },
          responses: {
            201: { description: 'Consumo registrado' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/inventario/consumo': {
        post: {
          tags: ['Inventario'],
          summary: 'Registra consumo de insumos de limpieza',
          security: bearerAuth,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventarioConsumoRequest' } } },
          },
          responses: {
            201: { description: 'Consumo de inventario registrado' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/inventario/alertas': {
        get: {
          tags: ['Inventario'],
          summary: 'Lista alertas de stock critico',
          security: bearerAuth,
          responses: {
            200: { description: 'Alertas listadas' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/inventario/{id}/umbral': {
        patch: {
          tags: ['Inventario'],
          summary: 'Actualiza el umbral minimo de un insumo',
          security: bearerAuth,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UmbralInventarioRequest' } } },
          },
          responses: {
            200: { description: 'Umbral actualizado' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/reportes/ocupacion': {
        get: {
          tags: ['Reportes'],
          summary: 'Obtiene el reporte mensual de ocupacion',
          security: bearerAuth,
          parameters: [
            { name: 'mes', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 }, example: 5 },
            { name: 'anio', in: 'query', schema: { type: 'integer' }, example: 2025 },
            { name: 'meses', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 }, example: 1 },
          ],
          responses: {
            200: { description: 'Reporte generado' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/reportes/ingresos': {
        get: {
          tags: ['Reportes'],
          summary: 'Obtiene el reporte de ingresos',
          security: bearerAuth,
          parameters: [
            { name: 'mes', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 }, example: 5 },
            { name: 'anio', in: 'query', schema: { type: 'integer' }, example: 2025 },
            { name: 'meses', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 }, example: 1 },
            { name: 'fechaInicio', in: 'query', schema: { type: 'string', format: 'date' }, example: '2025-05-01' },
            { name: 'fechaFin', in: 'query', schema: { type: 'string', format: 'date' }, example: '2025-06-01' },
          ],
          responses: {
            200: { description: 'Reporte generado' },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
    },
  },
  apis: [],
});
