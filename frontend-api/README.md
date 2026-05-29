# Grand Stay Frontend API

Referencia rapida para consumir el backend desde frontend.

## Base URL

```js
export const API_BASE_URL = 'http://localhost:4000';
```

No existe prefijo `/api` en el backend actual. Por ejemplo, reportes usa:

```http
GET http://localhost:4000/reportes/ingresos
```

## Autenticacion

Los endpoints protegidos requieren JWT:

```http
Authorization: Bearer <token>
```

El token se obtiene en:

```http
POST /auth/login
```

Body:

```json
{
  "usuario": "recep1@grandstay.com",
  "password": "<password>",
  "otp": "123456"
}
```

`otp` solo aplica para usuarios con rol `Administrador`.

## Uso

```js
import { endpoints } from './endpoints.js';
import { apiRequest } from './apiClient.js';

const data = await apiRequest(endpoints.reportes.ingresos, {
  token,
  query: { fechaInicio: '2026-01-01', fechaFin: '2026-12-31' },
});
```

Para rutas con parametros:

```js
await apiRequest(endpoints.checkin.registrar, {
  token,
  pathParams: { reservaId: 3 },
});
```

## Notas

- `mantenimiento` no tiene ruta propia; se maneja con `PATCH /habitaciones/:id/estado`.
- Auditoria no tiene endpoint HTTP propio; funciona internamente via middleware/servicio.
- No guardar tokens reales en este directorio.
