import { API_BASE_URL, buildPath } from './endpoints.js';

function buildQuery(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export async function apiRequest(endpoint, {
  token = null,
  pathParams = {},
  query = {},
  body = undefined,
  baseUrl = API_BASE_URL,
} = {}) {
  const url = `${baseUrl}${buildPath(endpoint.path, pathParams)}${buildQuery(query)}`;
  const headers = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    method: endpoint.method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' && data?.mensaje ? data.mensaje : 'Error consumiendo la API';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
