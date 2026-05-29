# Historias de Usuario Backend - Grand-Stay

Fuente base: `HU Grand Stay.docx`  
Revision contra codigo: `Backend/src`  
Fecha de revision: 2026-05-29

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Implementadas | 10 |
| Parciales | 2 |
| Pendientes | 0 |

## Tabla general

| ID | Historia de usuario | Estado | Evidencia |
| --- | --- | --- | --- |
| HU-B01 | Consulta de disponibilidad en tiempo real | Implementada | `GET /habitaciones/disponibilidad`, validaciones y pruebas |
| HU-B02 | Creacion de reserva con anticipo | Implementada | `POST /reservas`, token obligatorio, pago mock, transaccion y auditoria |
| HU-B03 | Prevencion de overbooking | Implementada | `overbooking.service.js` con `SELECT ... FOR UPDATE` y auditoria |
| HU-B04 | Cancelacion con penalizacion | Implementada | `DELETE /reservas/:id`, solo estados `pendiente`/`confirmada`, reembolso y auditoria |
| HU-B05 | Registro de check-in | Implementada | `POST /checkin/:reservaId`, valida estado y ventana de fecha |
| HU-B06 | Check-out y liquidacion | Parcial | `POST /checkout/:reservaId`, exige tarifa activa, cobra saldo, factura en BD y evento; PDF/correo real siguen pendientes |
| HU-B07 | Gestion de estados de habitacion | Implementada | `PATCH /habitaciones/:id/estado`, transiciones por rol y auditoria |
| HU-B08 | Consumos adicionales | Implementada | `POST /consumos`, `GET /consumos/:reservaId`, `GET /consumos/mis-consumos` |
| HU-B09 | Autenticacion y roles | Implementada | `POST /auth/login`, JWT, bcrypt, OTP administrador y middleware de roles |
| HU-B10 | Log de auditoria | Parcial | `logAudit` redacta datos sensibles y registra hash; falta hardening DB append-only |
| HU-B11 | Inventario y alerta de stock | Implementada | `POST /inventario/consumo`, `GET /inventario/alertas`, `PATCH /inventario/:id/umbral` |
| HU-B12 | Reportes estadisticos | Implementada | `GET /reportes/ocupacion`, `GET /reportes/ingresos`, JSON y `pdf_trigger` |

## Cambios de auditoria aplicados el 2026-05-29

- Compose raiz usa Aiven/remoto por variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_SSL_MODE`; MySQL local queda bajo perfil `local-db`.
- Nuevo `GET /health/db` valida la conexion activa sin exponer host, usuario, password ni secretos.
- `GET /consumos/:reservaId` permite a Recepcionista/Administrador consultar consumos de una reserva.
- `GET /consumos/mis-consumos` permite a Huesped consultar sus propios consumos.
- `GET /reservas/mis-reservas` permite que el portal del huesped liste sus reservas.
- `GET /checkout/:reservaId/resumen` entrega preliquidacion antes del checkout.
- `GET /servicios`, `GET/POST/PUT/DELETE /tarifas`, `GET /facturas/reserva/:reservaId`, `GET /inventario/insumos`, `GET /inventario/historial` y `GET /auditoria` cubren pantallas frontend que antes dependian de stubs.
- `POST /consumos` usa el precio de `servicios_adicionales` y valida coherencia de servicio/tipo, evitando precios manipulados por cliente.
- `ServicioTecnico` puede consultar habitaciones y participar en transiciones de mantenimiento.
- Creacion de reserva ya no autogenera `token_pago`; debe llegar explicitamente desde el cliente o prueba.
- Cancelacion solo aplica a reservas `pendiente` o `confirmada`; evita liberar habitaciones de estadias activas o finalizadas.
- Check-in valida que la fecha actual este dentro de la ventana de la reserva.
- Check-out falla de forma controlada si no hay tarifa activa aplicable, evitando liquidaciones en cero.
- `database/grandstay_db.sql` y `database/seed-data.sql` quedan alineados con los enums y columnas usados por backend.

## Limitaciones conocidas

- La pasarela de pagos sigue siendo mock/stub.
- El PDF de factura es payload simulado; no se genera archivo PDF real.
- El correo de factura queda encolado en `notificaciones`; no hay proveedor SMTP real.
- Auditoria tiene endpoint de consulta para administrador, pero no tiene politica DB verificada de solo insercion.
- `src/routes/disponibilidad.routes.js` es codigo duplicado no montado; la ruta real vive en `habitaciones.routes.js`.

## Pruebas

Comando:

```bash
npm test -- --runInBand --coverage=false
```

Resultado posterior a los cambios:

- 22 suites aprobadas.
- 166 pruebas aprobadas.
