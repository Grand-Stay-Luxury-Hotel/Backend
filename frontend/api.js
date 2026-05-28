import { buildUrl, endpoints } from './endpoints.js';

function createHeaders(token = null, extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

async function request(path, {
  method = 'GET',
  token = null,
  pathParams = {},
  query = {},
  body = null,
  headers = {},
} = {}) {
  const response = await fetch(buildUrl(path, pathParams, query), {
    method,
    headers: createHeaders(token, headers),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(data?.mensaje ?? `Error HTTP ${response.status}`);
  }

  return data;
}

export function getRequest(path, { token = null, pathParams = {}, query = {} } = {}) {
  return request(path, { method: 'GET', token, pathParams, query });
}

export function postRequest(path, body, { token = null, pathParams = {}, query = {} } = {}) {
  return request(path, { method: 'POST', token, pathParams, query, body });
}

export function putRequest(path, body, { token = null, pathParams = {}, query = {} } = {}) {
  return request(path, { method: 'PUT', token, pathParams, query, body });
}

export function patchRequest(path, body, { token = null, pathParams = {}, query = {} } = {}) {
  return request(path, { method: 'PATCH', token, pathParams, query, body });
}

export function deleteRequest(path, { token = null, pathParams = {}, query = {} } = {}) {
  return request(path, { method: 'DELETE', token, pathParams, query });
}

export const api = {
  health() {
    return getRequest(endpoints.health.status.path);
  },

  login({ usuario, password, otp }) {
    return postRequest(endpoints.auth.login.path, { usuario, password, otp });
  },

  consultarDisponibilidad({ token, fechaEntrada, fechaSalida, tipo, capacidad }) {
    return getRequest(endpoints.habitaciones.disponibilidad.path, {
      token,
      query: { fechaEntrada, fechaSalida, tipo, capacidad },
    });
  },

  actualizarEstadoHabitacion({ token, id, estado, observaciones }) {
    return patchRequest(
      endpoints.habitaciones.actualizarEstado.path,
      { estado, observaciones },
      { token, pathParams: { id } },
    );
  },

  crearReserva({ token, reserva }) {
    return postRequest(endpoints.reservas.crear.path, reserva, { token });
  },

  cancelarReserva({ token, id }) {
    return deleteRequest(endpoints.reservas.cancelar.path, {
      token,
      pathParams: { id },
    });
  },

  registrarCheckin({ token, reservaId, documentoVerificado = true, observaciones = null }) {
    return postRequest(
      endpoints.checkin.registrar.path,
      { documento_verificado: documentoVerificado, observaciones },
      { token, pathParams: { reservaId } },
    );
  },

  registrarCheckout({ token, reservaId, observaciones = null }) {
    return postRequest(
      endpoints.checkout.registrar.path,
      { observaciones },
      { token, pathParams: { reservaId } },
    );
  },

  registrarConsumo({ token, consumo }) {
    return postRequest(endpoints.consumos.registrar.path, consumo, { token });
  },

  registrarConsumoInventario({ token, consumo }) {
    return postRequest(endpoints.inventario.registrarConsumo.path, consumo, { token });
  },

  listarAlertasInventario({ token }) {
    return getRequest(endpoints.inventario.alertas.path, { token });
  },

  actualizarUmbralInventario({ token, id, umbral }) {
    return patchRequest(
      endpoints.inventario.actualizarUmbral.path,
      { umbral },
      { token, pathParams: { id } },
    );
  },

  reporteOcupacion({ token, mes, anio, meses = 1 }) {
    return getRequest(endpoints.reportes.ocupacion.path, {
      token,
      query: { mes, anio, meses },
    });
  },

  reporteIngresos({ token, mes, anio, meses = 1, fechaInicio = null, fechaFin = null }) {
    return getRequest(endpoints.reportes.ingresos.path, {
      token,
      query: { mes, anio, meses, fechaInicio, fechaFin },
    });
  },

  ejemploPutGenerico({ token, path, body }) {
    return putRequest(path, body, { token });
  },
};

export { request };
