# Grand-Stay · Backend

API REST del sistema de gestión hotelera **Grand Stay**. Implementa las historias de usuario HU-B01 a HU-B12 con Node.js 20, Express, JWT, MySQL/MariaDB y cobertura de pruebas con Jest.

---

## Tabla de contenidos

- [Alcance implementado](#alcance-implementado)
- [Requisitos](#requisitos)
- [Configuración local](#configuración-local)
- [Docker](#docker)
- [Referencia de endpoints](#referencia-de-endpoints)
- [Roles y autorización](#roles-y-autorización)
- [Auditoría](#auditoría)
- [Pruebas](#pruebas)

---

## Alcance implementado

| HU     | Funcionalidad                                       | Estado       |
|--------|-----------------------------------------------------|--------------|
| HU-B01 | Consulta de disponibilidad en tiempo real           | ✅ Implementada |
| HU-B02 | Creación de reserva con anticipo                    | ✅ Implementada |
| HU-B03 | Prevención de overbooking                           | ✅ Implementada |
| HU-B04 | Cancelación de reserva con política de penalización | ✅ Implementada |
| HU-B05 | Registro de check-in                                | ✅ Implementada |
| HU-B06 | Registro de check-out y liquidación                 | ✅ Implementada |
| HU-B07 | Gestión de estados de habitación                    | ✅ Implementada |
| HU-B08 | Registro de consumos adicionales                    | ✅ Implementada |
| HU-B09 | Autenticación y control de roles (+ registro de huéspedes) | ✅ Implementada |
| HU-B10 | Log de auditoría de operaciones críticas            | ✅ Implementada |
| HU-B11 | Gestión de inventario con alerta de stock           | ✅ Implementada |
| HU-B12 | Reportes estadísticos mensuales                     | ✅ Implementada |

---

## Requisitos

- **Node.js** 20 o superior
- **MySQL** 8 o **MariaDB** 10.6+
- Base de datos inicializada desde `grandstay_db.sql`

---

## Configuración local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el archivo `.env`

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=grandstay_db
DB_USER=grandstay_user
DB_PASSWORD=tu_password_seguro

# JWT
JWT_SECRET=minimo_32_caracteres_aqui_1234567890
JWT_EXPIRES_IN=8h

# OTP para Administrador (valor por defecto en desarrollo)
ADMIN_OTP=123456

# Servidor
PORT=4000
NODE_ENV=development

# Pasarela de pago (mock)
PAYMENT_GATEWAY_URL=https://api.pasarela-mock.com
PAYMENT_GATEWAY_KEY=mock_key
```

> **Advertencia de seguridad:** nunca uses los valores por defecto de `JWT_SECRET` ni `ADMIN_OTP` en producción.

### 3. Levantar el servidor

```bash
# Desarrollo (con hot-reload nativo de Node 20)
npm run dev

# Producción
npm start
```

El backend queda disponible en `http://localhost:4000`.

---

## Docker

El servicio se containeriza de forma independiente. Ver [`DOCKER.md`](./DOCKER.md) para instrucciones completas.

```powershell
# Levantar
docker compose up -d --build

# Ver logs
docker compose logs -f

# Detener
docker compose down
```

Variables de entorno configurables en un archivo `.env` junto a `docker-compose.yml`. La imagen base es `node:20-alpine` y el puerto expuesto es `4000`.

---

## Referencia de endpoints

Todos los endpoints protegidos requieren el header:

```http
Authorization: Bearer <token>
```

### Salud

| Método | Ruta      | Auth | Descripción                     |
|--------|-----------|------|---------------------------------|
| GET    | `/health` | No   | Verifica que el servidor esté activo |

### Autenticación

| Método | Ruta              | Auth | Descripción                            |
|--------|-------------------|------|----------------------------------------|
| POST   | `/auth/login`     | No   | Inicio de sesión para cualquier rol    |
| POST   | `/auth/registro`  | No   | Registro de nuevo huésped (auto-login) |

**Body — `POST /auth/login`:**

```json
{
  "usuario": "admin@grandstay.com",
  "password": "secreto",
  "otp": "123456"
}
```

> El campo `otp` solo aplica para el rol `Administrador`.

**Body — `POST /auth/registro`:**

```json
{
  "nombre": "Juan",
  "apellido": "García",
  "email": "juan@email.com",
  "password": "minimo8chars",
  "telefono": "+57 300 000 0000",
  "documento_identidad": "1234567890"
}
```

> `telefono` y `documento_identidad` son opcionales. Devuelve 201 con el token JWT del huésped recién creado.

**Respuesta de ambos endpoints:**

```json
{
  "token": "<jwt>",
  "expira_en": "8h",
  "usuario": {
    "id_usuario": 1,
    "email": "juan@email.com",
    "rol": "Huesped",
    "id_huesped": 1,
    "id_recepcionista": null,
    "id_personal": null,
    "id_admin": null
  }
}
```

### Habitaciones

| Método | Ruta                                  | Auth | Roles permitidos                |
|--------|---------------------------------------|------|---------------------------------|
| GET    | `/habitaciones/disponibilidad`        | Sí   | Todos                           |
| PATCH  | `/habitaciones/:id/estado`            | Sí   | Recepcionista, Administrador    |

**Query params — disponibilidad:**

```
fechaEntrada=YYYY-MM-DD&fechaSalida=YYYY-MM-DD&tipo=Deluxe&capacidad=2
```

**Body — cambio de estado:**

```json
{
  "estado": "limpieza",
  "observaciones": "Habitación lista para limpieza"
}
```

Estados válidos: `disponible` · `ocupada` · `mantenimiento` · `limpieza` · `bloqueada`

### Reservas

| Método | Ruta             | Auth | Roles permitidos                          |
|--------|------------------|------|-------------------------------------------|
| POST   | `/reservas`      | Sí   | Recepcionista, Administrador, Huesped     |
| DELETE | `/reservas/:id`  | Sí   | Recepcionista, Administrador              |

### Check-in / Check-out

| Método | Ruta                   | Auth | Roles permitidos           |
|--------|------------------------|------|----------------------------|
| POST   | `/checkin/:reservaId`  | Sí   | Recepcionista, Administrador |
| POST   | `/checkout/:reservaId` | Sí   | Recepcionista, Administrador |

### Consumos adicionales

| Método | Ruta        | Auth | Roles permitidos           |
|--------|-------------|------|----------------------------|
| POST   | `/consumos` | Sí   | Recepcionista              |

**Body:**

```json
{
  "habitacionId": 101,
  "tipo": "restaurante",
  "descripcion": "Cena habitación",
  "cantidad": 1,
  "precio_unitario": 85000
}
```

Tipos válidos: `restaurante` · `lavanderia` · `spa`

### Inventario

| Método | Ruta                       | Auth | Roles permitidos                          |
|--------|----------------------------|------|-------------------------------------------|
| POST   | `/inventario/consumo`      | Sí   | Administrador, PersonalLimpieza           |
| GET    | `/inventario/alertas`      | Sí   | Administrador, PersonalLimpieza           |
| PATCH  | `/inventario/:id/umbral`   | Sí   | Administrador                             |

**Body — consumo de insumo:**

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

| Método | Ruta                   | Auth | Roles permitidos  |
|--------|------------------------|------|-------------------|
| GET    | `/reportes/ocupacion`  | Sí   | Administrador     |
| GET    | `/reportes/ingresos`   | Sí   | Administrador     |

**Query params:** `mes=5&anio=2026`

---

## Roles y autorización

El middleware verifica el JWT y extrae el rol. Los roles definidos en la base de datos son:

| Rol              | Descripción                                    |
|------------------|------------------------------------------------|
| `Administrador`  | Acceso total + OTP requerido en login          |
| `Recepcionista`  | Operaciones del día a día (reservas, checkin…) |
| `PersonalLimpieza` | Gestión de habitaciones e inventario         |
| `Huesped`        | Consulta de disponibilidad y reservas propias  |

---

## Auditoría

Las operaciones críticas quedan registradas en la tabla `log_auditoria` con los siguientes campos:

- `id_usuario` — quién ejecutó la acción
- `accion` — tipo (`INSERT`, `UPDATE`, `DELETE`)
- `tabla_afectada` — tabla modificada
- `id_registro` — PK del registro afectado
- `valor_anterior` / `valor_nuevo` — snapshot JSON antes y después
- `ip` / `user_agent` — trazabilidad de red
- Hash SHA-256 de integridad embebido en `valor_nuevo`

---

## Pruebas

```bash
# Suite completa con cobertura
npm test -- --runInBand

# Solo pruebas unitarias
npm run test:unit

# Solo pruebas de integración
npm run test:integration
```

Umbral de cobertura configurado: **≥ 80 %** en branches, functions, lines y statements.

Última verificación:

- 16 suites aprobadas
- 97 pruebas aprobadas
- Cobertura global sobre los umbrales configurados
