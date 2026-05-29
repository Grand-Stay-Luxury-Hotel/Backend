# Grand Stay Backend

API REST para la gestion hotelera de Grand Stay. Usa Node.js 20, Express, JWT, MySQL/MariaDB y pruebas con Jest.

## Requisitos

- Node.js 20 o superior.
- MySQL 8 o MariaDB compatible.
- Base de datos creada desde `database/grandstay_db.sql`.
- Datos de prueba opcionales desde `database/seed-data.sql`.

## Instalacion

```bash
npm install
```

Crear `.env` a partir de `.env.example` y configurar al menos:

```env
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=23465
DB_NAME=grandstay_db
DB_USER=avnadmin
DB_PASSWORD=change_me
DB_SSL_MODE=REQUIRED
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA_PATH=./ca.pem
DB_NAME_TEST=grandstay_test

JWT_SECRET=change_me_min_32_chars_please_replace
JWT_EXPIRES_IN=8h
ADMIN_OTP=123456

PAYMENT_GATEWAY_URL=https://api.pasarela-mock.com
PAYMENT_GATEWAY_KEY=mock_key

PORT=4000
NODE_ENV=development
```

`JWT_SECRET` debe tener al menos 32 caracteres. El rol `Administrador` requiere `otp` al iniciar sesion.

## Ejecucion

```bash
npm run dev
```

El backend queda disponible en:

```http
http://localhost:4000
```

Verificacion:

```http
GET /health
GET /health/db
```

Para Aiven se recomienda dejar `DB_SSL_REJECT_UNAUTHORIZED=true` y apuntar `DB_SSL_CA_PATH` al certificado CA. En Docker, `ca.pem` se monta dentro del contenedor como `/app/ca.pem`.

## Swagger

Con el servidor activo:

- UI: `http://localhost:4000/api-docs`
- JSON: `http://localhost:4000/api-docs.json`

## Frontend API

La carpeta [`frontend-api`](./frontend-api) contiene:

- `endpoints.js`: rutas organizadas por modulo, metodo, auth y roles.
- `apiClient.js`: cliente base con soporte para JWT, query params y path params.
- `README.md`: ejemplos cortos de consumo.

El backend actual no usa prefijo `/api`. Ejemplo real:

```http
GET http://localhost:4000/reportes/ingresos
```

## Autenticacion

Login:

```http
POST /auth/login
```

Body:

```json
{
  "usuario": "admin@grandstay.com",
  "password": "<password>",
  "otp": "123456"
}
```

Registro de huesped:

```http
POST /auth/registro
```

Body:

```json
{
  "nombre": "Juan",
  "apellido": "Garcia",
  "email": "juan@email.com",
  "password": "Minimo8chars",
  "telefono": "+57 300 000 0000",
  "num_documento": "1234567890"
}
```

Endpoints protegidos:

```http
Authorization: Bearer <token>
```

## Rutas principales

### Habitaciones y mantenimiento

Mantenimiento no tiene ruta propia; se gestiona con estados de habitacion.

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/habitaciones` | Recepcionista, Administrador, PersonalLimpieza |
| GET | `/habitaciones/disponibilidad` | Recepcionista, Huesped |
| PATCH | `/habitaciones/:id/estado` | PersonalLimpieza, Recepcionista, Administrador |

Estados de habitacion:

```text
disponible, ocupada, limpieza, mantenimiento, bloqueada
```

### Reservas

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/reservas` | Recepcionista, Administrador |
| GET | `/reservas/mis-reservas` | Huesped |
| POST | `/reservas` | Recepcionista, Huesped |
| DELETE | `/reservas/:id` | Recepcionista, Administrador |

Estados usados:

```text
pendiente, confirmada, en_curso, completada, cancelada, no_show
```

Crear una reserva exige `token_pago`; no se almacenan datos de tarjeta. La habitacion pasa a `ocupada` en check-in. La cancelacion solo esta permitida para reservas `pendiente` o `confirmada`.

### Check-in y checkout

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/checkout/:reservaId/resumen` | Recepcionista |
| POST | `/checkin/:reservaId` | Recepcionista |
| POST | `/checkout/:reservaId` | Recepcionista |

Flujo esperado:

```text
Reserva confirmada -> check-in -> reserva en_curso + habitacion ocupada
Reserva en_curso -> checkout -> reserva completada + habitacion limpieza
```

Checkout acepta `estado_habitacion` o `estadoHabitacion` para el registro de salida:

```text
bueno, danos_menores, danos_graves, pendiente_revision
```

Ese valor es distinto del estado operativo de la habitacion, que queda en `limpieza`.

### Consumos

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/consumos/:reservaId` | Recepcionista, Administrador |
| GET | `/consumos/mis-consumos` | Huesped |
| POST | `/consumos` | Recepcionista |

Tipos validos:

```text
restaurante, lavanderia, spa
```

El precio aplicado al consumo se toma desde `servicios_adicionales`; el backend no confia en precios enviados por el cliente.

### Servicios adicionales y tarifas

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/servicios` | Recepcionista, Administrador, Huesped |
| GET | `/tarifas` | Administrador, Recepcionista |
| POST | `/tarifas` | Administrador |
| PUT | `/tarifas/:id` | Administrador |
| DELETE | `/tarifas/:id` | Administrador |

`DELETE /tarifas/:id` desactiva la tarifa; no elimina el registro fisicamente.

### Facturas

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/facturas/reserva/:reservaId` | Recepcionista, Administrador, Huesped |

### Inventario

| Metodo | Ruta | Roles |
|---|---|---|
| POST | `/inventario/consumo` | Administrador, PersonalLimpieza |
| GET | `/inventario/insumos` | Administrador, PersonalLimpieza |
| GET | `/inventario/historial` | Administrador, PersonalLimpieza |
| GET | `/inventario/alertas` | Administrador |
| PATCH | `/inventario/:id/umbral` | Administrador |

### Reportes

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/reportes/ocupacion` | Administrador |
| GET | `/reportes/ingresos` | Administrador |

Ejemplos:

```http
GET /reportes/ocupacion?mes=5&anio=2026&meses=1
GET /reportes/ingresos?fechaInicio=2026-01-01&fechaFin=2026-12-31
```

Los reportes devuelven JSON. El campo `pdf_trigger`, si aparece en `exportable`, indica integracion pendiente; no existe generacion PDF directa en este backend.

## Auditoria

Auditoria funciona como middleware/servicio interno y puede consultarse por administrador.

| Metodo | Ruta | Roles |
|---|---|---|
| GET | `/auditoria` | Administrador |

La tabla principal es `log_auditoria`. El backend redacta campos sensibles comunes antes de registrar valores auditados.

## Pruebas

```bash
npm test -- --runInBand
npm run test:unit
npm run test:integration
```

El proyecto exige cobertura global minima de 80%.

## Pendientes conocidos

- Mantener el schema remoto de Aiven alineado con `database/grandstay_db.sql`.
- Evitar triggers de BD que dupliquen cambios de estado ya controlados por el backend.
- Pasarela, envio de correos y generacion real de PDF siguen como mocks/stubs.
