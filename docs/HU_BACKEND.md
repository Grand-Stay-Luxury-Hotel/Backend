# Historias de Usuario Backend - Grand-Stay

Fuente base: `HU Grand Stay.docx`  
Revision contra codigo: `Backend/src`  
Fecha de revision: 2026-05-16

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Implementadas | 9 |
| Parciales | 3 |
| Pendientes | 0 |

## Criterio de estado

- **Implementada:** existe endpoint/logica principal y coincide con la historia de usuario.
- **Parcial:** existe una parte importante, pero falta algun criterio de aceptacion o hay una desviacion funcional.
- **Pendiente:** no hay endpoint, servicio o flujo visible que cubra la HU.

## Tabla general

| ID | Historia de usuario | Modulo | Prioridad | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| HU-B01 | Consulta de disponibilidad en tiempo real | Reservas | Alta | Implementada | `GET /habitaciones/disponibilidad`, servicio `disponibilidad.service.js`, pruebas unitarias e integracion |
| HU-B02 | Creacion de reserva con anticipo | Reservas | Alta | Parcial | `POST /reservas`, pago/token y transaccion implementados; el estado pasa a `ocupada`, no a `reservada` como pide el CA |
| HU-B03 | Prevencion de overbooking | Reservas | Alta | Implementada | `overbooking.service.js` usa `SELECT ... FOR UPDATE`, retorna conflicto y audita intentos |
| HU-B04 | Cancelacion de reserva con politica de penalizacion | Reservas | Alta | Implementada | `DELETE /reservas/:id`, calculo de penalizacion, reembolso y auditoria |
| HU-B05 | Registro de Check-in | Check-in / Check-out | Alta | Implementada | `POST /checkin/:reservaId`, valida reserva confirmada, genera codigo de acceso, cambia habitacion a `ocupada` |
| HU-B06 | Registro de Check-out y liquidacion | Check-in / Check-out | Alta | Parcial | `POST /checkout/:reservaId`, liquidacion, cobro, factura en BD y evento; no genera PDF real y usa estado `limpieza`, no `sucia` |
| HU-B07 | Gestion de estados de habitacion | Habitaciones | Alta | Implementada | `PATCH /habitaciones/:id/estado`, validacion de transiciones, roles y auditoria |
| HU-B08 | Registro de consumos adicionales a habitacion | Servicios Adicionales | Alta | Implementada | `POST /consumos`, valida habitacion ocupada, vincula reserva activa y recalcula acumulado |
| HU-B09 | Autenticacion y control de roles | Seguridad | Alta | Implementada | `POST /auth/login`, JWT, bcrypt, OTP para administrador y middleware de roles |
| HU-B10 | Log de auditoria de operaciones criticas | Seguridad | Alta | Parcial | Hay `logAudit` y hash SHA-256; falta evidencia de repositorio separado y restriccion DB solo insercion |
| HU-B11 | Gestion de inventario de insumos con alerta de stock | Inventario | Media | Implementada | `POST /inventario/consumo`, `GET /inventario/alertas`, `PATCH /inventario/:id/umbral` |
| HU-B12 | Generacion de reportes estadisticos mensuales | Reportes | Media | Implementada | `GET /reportes/ocupacion`, `GET /reportes/ingresos`, salida JSON y trigger PDF |

## HU implementadas

### HU-B01 - Consulta de disponibilidad en tiempo real

**Estado:** Implementada

**Implementado:**
- Endpoint `GET /habitaciones/disponibilidad`.
- Parametros `fechaEntrada`, `fechaSalida`, `tipo` y `capacidad`.
- Validacion de rango de fechas.
- Respuesta vacia con HTTP 200 cuando no hay resultados.
- Pruebas unitarias e integracion disponibles.

**Pendiente o no verificado:**
- Prueba formal de rendimiento de respuesta menor o igual a 2 segundos.

### HU-B03 - Prevencion de overbooking

**Estado:** Implementada

**Implementado:**
- Bloqueo con `SELECT ... FOR UPDATE`.
- Deteccion de reservas solapadas.
- Error de conflicto para overbooking.
- Registro de intento en auditoria.

**Pendiente o no verificado:**
- Prueba de carga con 50 usuarios concurrentes.

### HU-B04 - Cancelacion de reserva con politica de penalizacion

**Estado:** Implementada

**Implementado:**
- Endpoint `DELETE /reservas/:id`.
- Calculo automatico de penalizacion.
- Solicitud de reembolso mediante token de pago cuando aplica.
- Cambio de habitacion a `disponible`.
- Registro en auditoria.

### HU-B05 - Registro de Check-in

**Estado:** Implementada

**Implementado:**
- Endpoint `POST /checkin/:reservaId`.
- Validacion de reserva existente y estado `confirmada`.
- Insercion de registro de check-in.
- Generacion de codigo de acceso.
- Cambio atomico de habitacion a `ocupada`.
- Evento de codigo de acceso y auditoria.

### HU-B07 - Gestion de estados de habitacion

**Estado:** Implementada

**Implementado:**
- Endpoint `PATCH /habitaciones/:id/estado`.
- Estados soportados: `disponible`, `ocupada`, `limpieza`, `mantenimiento`, `bloqueada`.
- Validacion de transiciones.
- Validacion de roles para limpieza, recepcion y administracion.
- Auditoria de cambios.

**Pendiente o no verificado:**
- No se encontro una tabla especifica de historial de habitacion; la trazabilidad queda en auditoria.

### HU-B08 - Registro de consumos adicionales a habitacion

**Estado:** Implementada

**Implementado:**
- Endpoint `POST /consumos`.
- Tipos soportados: `restaurante`, `lavanderia`, `spa`.
- Valida que la habitacion este `ocupada`.
- Vincula el consumo a la reserva activa.
- Recalcula total acumulado.
- Auditoria del consumo.

### HU-B09 - Autenticacion y control de roles

**Estado:** Implementada

**Implementado:**
- Endpoint `POST /auth/login`.
- Validacion de usuario y password.
- Soporte bcrypt con costo minimo validado.
- JWT con claims de usuario, rol e ids operativos.
- Expiracion configurable, por defecto `8h`.
- OTP requerido para rol `Administrador`.
- Middleware `verifyToken` y `authorizeRoles`.

### HU-B11 - Gestion de inventario de insumos con alerta de stock

**Estado:** Implementada

**Implementado:**
- Endpoint `POST /inventario/consumo`.
- Descuento de stock con validacion de no negativo.
- Creacion de alerta cuando el stock queda bajo el umbral.
- Endpoint `GET /inventario/alertas`.
- Endpoint `PATCH /inventario/:id/umbral`.
- Auditoria de cambios.

### HU-B12 - Generacion de reportes estadisticos mensuales

**Estado:** Implementada

**Implementado:**
- Endpoint `GET /reportes/ocupacion?mes={mes}&anio={anio}`.
- Endpoint `GET /reportes/ingresos`.
- Reportes desagregados por tipo/categoria.
- Respuesta JSON.
- Campo de exportacion para `pdf_trigger`.

**Pendiente o no verificado:**
- Prueba formal de rendimiento para periodos de hasta 12 meses.

## HU parciales

### HU-B02 - Creacion de reserva con anticipo

**Estado:** Parcial

**Implementado:**
- Endpoint `POST /reservas`.
- Valida disponibilidad y previene solapamientos.
- Usa pasarela simulada para autorizar anticipo.
- Guarda token de pago.
- Operacion transaccional.
- Retorna error HTTP 402 si el pago falla.
- Auditoria de reserva creada.

**Falta o requiere ajuste:**
- El criterio indica cambiar habitacion a `Reservada`; el codigo la cambia a `ocupada`.
- El response actual devuelve `id_reserva`, estado y mensaje; si se requiere numero/codigo visible en frontend, conviene devolver `codigo_confirmacion`.

### HU-B06 - Registro de Check-out y liquidacion

**Estado:** Parcial

**Implementado:**
- Endpoint `POST /checkout/:reservaId`.
- Suma tarifa por noches y consumos.
- Cobra saldo pendiente con token.
- Inserta factura en base de datos.
- Emite evento `factura.generada`.
- Marca `factura_enviada: true`.
- Auditoria de check-out.

**Falta o requiere ajuste:**
- No se genera un PDF real de factura electronica.
- No se encontro cola real de notificaciones/correo; existe evento interno.
- El criterio pide estado `Sucia`; el codigo usa `limpieza`.

### HU-B10 - Log de auditoria de operaciones criticas

**Estado:** Parcial

**Implementado:**
- Middleware/servicio de auditoria.
- Registros para reservas, check-in, check-out, consumos, habitaciones e inventario.
- Incluye usuario, accion, tabla afectada, registro, valores, IP, user-agent y hash SHA-256.

**Falta o requiere ajuste:**
- No se encontro repositorio separado para auditoria.
- No se puede confirmar desde el codigo que la tabla sea estrictamente solo insercion a nivel de permisos DB.
- No se observaron operaciones de cambio de tarifa porque no existe modulo backend de tarifas.

## HU pendientes

No hay HU backend completamente pendientes. Las pendientes reales son ajustes de cumplimiento en HU parciales.

## Pruebas disponibles

Comando ejecutado:

```bash
npm test -- --runInBand
```

Resultado:

- 16 suites aprobadas.
- 97 pruebas aprobadas.
- Cobertura global por encima de los umbrales configurados.
