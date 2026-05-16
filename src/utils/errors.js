// src/utils/errors.js
export class AppError extends Error {
  constructor(codigo, mensaje, statusCode = 500, detalle = null) {
    super(mensaje);
    this.name = this.constructor.name;
    this.codigo = codigo;
    this.statusCode = statusCode;
    this.detalle = detalle;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ParametrosInvalidosError extends AppError {
  constructor(mensaje = 'Los parámetros enviados no son válidos', detalle = null) {
    super('PARAMETROS_INVALIDOS', mensaje, 400, detalle);
  }
}

export class NoAutorizadoError extends AppError {
  constructor(mensaje = 'Token de acceso no proporcionado o inválido') {
    super('NO_AUTORIZADO', mensaje, 401);
  }
}

export class AccesoDenegadoError extends AppError {
  constructor(mensaje = 'No tienes permisos para ejecutar esta acción') {
    super('ACCESO_DENEGADO', mensaje, 403);
  }
}

export class OverbookingError extends AppError {
  constructor(mensaje = 'La habitación seleccionada no está disponible en las fechas indicadas', detalle = null) {
    super('HABITACION_NO_DISPONIBLE', mensaje, 409, detalle);
  }
}

export class PagoRechazadoError extends AppError {
  constructor(mensaje = 'La pasarela rechazó el pago', detalle = null) {
    super('PAGO_RECHAZADO', mensaje, 402, detalle);
  }
}

export class ReservaNoEncontradaError extends AppError {
  constructor(mensaje = 'La reserva solicitada no existe') {
    super('RESERVA_NO_ENCONTRADA', mensaje, 404);
  }
}

export class ReservaEstadoInvalidoError extends AppError {
  constructor(mensaje = 'La reserva no cumple las condiciones para esta operación') {
    super('RESERVA_ESTADO_INVALIDO', mensaje, 400);
  }
}

export class RecursoNoEncontradoError extends AppError {
  constructor(mensaje = 'El recurso solicitado no existe') {
    super('RECURSO_NO_ENCONTRADO', mensaje, 404);
  }
}

export class EntidadNoProcesableError extends AppError {
  constructor(mensaje = 'La entidad no cumple las condiciones para esta operacion', detalle = null) {
    super('ENTIDAD_NO_PROCESABLE', mensaje, 422, detalle);
  }
}

export function errorResponse(error) {
  const statusCode = error.statusCode ?? 500;
  const respuesta = {
    error: true,
    codigo: error.codigo ?? 'ERROR_INTERNO',
    mensaje: statusCode >= 500 ? 'Error interno del servidor' : error.message,
  };

  if (error.detalle || process.env.NODE_ENV === 'development') {
    respuesta.detalle = error.detalle ?? error.message;
  }

  return { statusCode, respuesta };
}
