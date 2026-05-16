# Grand-Stay Backend

Backend REST para el sistema de gestion hotelera Grand-Stay. Implementa las historias de usuario backend HU-B01 a HU-B12 usando Node.js, Express, JWT, MySQL/MariaDB y pruebas con Jest.

## Alcance Implementado

| HU | Funcionalidad | Estado |
| --- | --- | --- |
| HU-B01 | Consulta de disponibilidad en tiempo real | Implementada |
| HU-B02 | Creacion de reserva con anticipo | Implementada |
| HU-B03 | Prevencion de overbooking | Implementada |
| HU-B04 | Cancelacion de reserva con politica de penalizacion | Implementada |
| HU-B05 | Registro de check-in | Implementada |
| HU-B06 | Registro de check-out y liquidacion | Implementada |
| HU-B07 | Gestion de estados de habitacion | Implementada |
| HU-B08 | Registro de consumos adicionales | Implementada |
| HU-B09 | Autenticacion y control de roles | Implementada |
| HU-B10 | Log de auditoria de operaciones criticas | Implementada |
| HU-B11 | Gestion de inventario con alerta de stock | Implementada |
| HU-B12 | Reportes estadisticos mensuales | Implementada |

## Requisitos

- Node.js 20 o superior
- MySQL o MariaDB
- Base de datos creada desde `grandstay_db.sql`

## Configuracion

1. Instalar dependencias:

```bash
npm install
```

2. Crear el archivo `.env` tomando como base `.env.example`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=grandstay_db
DB_USER=grandstay_user
DB_PASSWORD=your_password
DB_NAME_TEST=grandstay_test

JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=8h
ADMIN_OTP=123456

PORT=4000
NODE_ENV=development
```

3. Ejecutar el servidor:

```bash
npm run dev
```

El backend queda disponible por defecto en `http://localhost:4000`.

## Swagger / OpenAPI

Con el servidor en ejecucion, la documentacion interactiva esta disponible en:

- Swagger UI: `http://localhost:4000/api-docs`
- Especificacion JSON: `http://localhost:4000/api-docs.json`

## Endpoints Principales

### Salud

- `GET /health`

### Autenticacion

- `POST /auth/login`

Body esperado:

```json
{
  "usuario": "admin@grandstay.com",
  "password": "secreto",
  "otp": "123456"
}
```

El campo `otp` aplica para usuarios con rol `Administrador`.

### Habitaciones

- `GET /habitaciones/disponibilidad?fechaEntrada=YYYY-MM-DD&fechaSalida=YYYY-MM-DD&tipo=Deluxe&capacidad=2`
- `PATCH /habitaciones/:id/estado`

Body para cambio de estado:

```json
{
  "estado": "limpieza",
  "observaciones": "Habitacion lista para limpieza"
}
```

Estados soportados por la base de datos:

- `disponible`
- `ocupada`
- `mantenimiento`
- `limpieza`
- `bloqueada`

### Reservas

- `POST /reservas`
- `DELETE /reservas/:id`

### Check-in / Check-out

- `POST /checkin/:reservaId`
- `POST /checkout/:reservaId`

### Consumos Adicionales

- `POST /consumos`

Body esperado:

```json
{
  "habitacionId": 101,
  "tipo": "restaurante",
  "descripcion": "Cena habitacion",
  "cantidad": 1,
  "precio_unitario": 85000
}
```

Tipos soportados:

- `restaurante`
- `lavanderia`
- `spa`

### Inventario

- `POST /inventario/consumo`
- `GET /inventario/alertas`
- `PATCH /inventario/:id/umbral`

Body para consumo de insumo:

```json
{
  "insumoId": 1,
  "habitacionId": 101,
  "idPersonal": 1,
  "cantidad": 2,
  "tipoTarea": "limpieza_rutina"
}
```

### Reportes

- `GET /reportes/ocupacion?mes=5&anio=2026`
- `GET /reportes/ingresos`

## Roles

Los endpoints protegidos esperan un JWT en el header:

```http
Authorization: Bearer <token>
```

Roles usados segun la base de datos:

- `Administrador`
- `Recepcionista`
- `PersonalLimpieza`
- `ServicioTecnico`
- `Huesped`

El middleware tambien acepta variantes como `Personal de Limpieza` para compatibilidad con pruebas.

## Auditoria

Las operaciones criticas registran trazabilidad en `log_auditoria`, incluyendo:

- usuario
- accion
- tabla afectada
- registro afectado
- valor anterior
- valor nuevo
- IP
- user agent
- hash SHA-256 de integridad dentro de `datos_nuevos`

## Pruebas

Ejecutar toda la suite:

```bash
npm test -- --runInBand
```

Ejecutar solo unitarias:

```bash
npm run test:unit
```

Ejecutar solo integracion:

```bash
npm run test:integration
```

Ultima verificacion realizada:

- 16 suites aprobadas
- 97 pruebas aprobadas
- Cobertura global sobre umbrales configurados
