# Referencia de API para Frontend

Esta carpeta contiene archivos de referencia para consumir el backend de Grand Stay desde una interfaz cliente.

## Archivos

- `endpoints.js`: mapa de rutas reales del backend, metodo HTTP, parametros, ejemplos de body y si requieren JWT.
- `api.js`: funciones de ejemplo usando `fetch` para consumir los endpoints principales.

## URL base

Por defecto se usa:

```js
http://localhost:4000
```

En un frontend con Vite se puede sobrescribir con:

```env
VITE_API_URL=http://localhost:4000
```

## Autenticacion

Primero se debe iniciar sesion:

```js
import { api } from './api.js';

const session = await api.login({
  usuario: 'recep1@grandstay.com',
  password: '<password>',
});

const token = session.token;
```

Los endpoints protegidos deben enviar:

```js
{
  Authorization: `Bearer ${token}`
}
```

## Ejemplos

```js
await api.consultarDisponibilidad({
  token,
  fechaEntrada: '2026-12-10',
  fechaSalida: '2026-12-12',
  tipo: 'Deluxe',
  capacidad: 2,
});

await api.crearReserva({
  token,
  reserva: {
    id_huesped: 1,
    id_habitacion: 1,
    fecha_entrada: '2026-12-10',
    fecha_salida: '2026-12-12',
    token_pago: '<payment_token>',
    monto_anticipo: 250000,
  },
});

await api.cancelarReserva({ token, id: 1 });
```

## Modulos sin endpoint propio

Segun las rutas actuales del backend:

- Usuarios: no hay endpoints CRUD publicados.
- Auditoria: existe registro interno en `log_auditoria`, pero no hay endpoint publico.
- Mantenimiento: se gestiona como cambio de estado de habitacion mediante `PATCH /habitaciones/:id/estado`.

No se incluyen credenciales, tokens reales ni datos sensibles en estos ejemplos.
