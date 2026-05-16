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
            usuario: { type: 'string', format: 'email', example: 'admin@grandstay.com' },
            password: { type: 'string', example: 'secreto' },
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
        ReservaRequest: {
          type: 'object',
          required: ['id_huesped', 'id_habitacion', 'fecha_entrada', 'fecha_salida', 'token_pago', 'monto_anticipo'],
          properties: {
            id_huesped: { type: 'integer', example: 1 },
            id_habitacion: { type: 'integer', example: 101 },
            fecha_entrada: { type: 'string', format: 'date', example: '2026-06-01' },
            fecha_salida: { type: 'string', format: 'date', example: '2026-06-05' },
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
        ConsumoRequest: {
          type: 'object',
          required: ['habitacionId', 'tipo', 'descripcion', 'cantidad', 'precio_unitario'],
          properties: {
            habitacionId: { type: 'integer', example: 101 },
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
            habitacionId: { type: 'integer', example: 101 },
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
      { name: 'Habitaciones' },
      { name: 'Reservas' },
      { name: 'Check-in' },
      { name: 'Check-out' },
      { name: 'Consumos' },
      { name: 'Inventario' },
      { name: 'Reportes' },
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
      '/habitaciones/disponibilidad': {
        get: {
          tags: ['Habitaciones'],
          summary: 'Consulta disponibilidad de habitaciones',
          security: bearerAuth,
          parameters: [
            { name: 'fechaEntrada', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-06-01' },
            { name: 'fechaSalida', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-06-05' },
            { name: 'tipo', in: 'query', schema: { type: 'string' }, example: 'Deluxe' },
            { name: 'capacidad', in: 'query', schema: { type: 'integer' }, example: 2 },
          ],
          responses: {
            200: { description: 'Disponibilidad encontrada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/habitaciones/{id}/estado': {
        patch: {
          tags: ['Habitaciones'],
          summary: 'Actualiza el estado de una habitacion',
          security: bearerAuth,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 101 }],
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
        post: {
          tags: ['Reservas'],
          summary: 'Crea una reserva con anticipo',
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
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
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
          parameters: [{ name: 'reservaId', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: {
            201: { description: 'Check-in registrado' },
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
          parameters: [{ name: 'reservaId', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
          responses: {
            200: { description: 'Check-out procesado' },
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
            { name: 'anio', in: 'query', schema: { type: 'integer' }, example: 2026 },
          ],
          responses: {
            200: { description: 'Reporte generado' },
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
            { name: 'anio', in: 'query', schema: { type: 'integer' }, example: 2026 },
          ],
          responses: {
            200: { description: 'Reporte generado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
    },
  },
  apis: [],
});
