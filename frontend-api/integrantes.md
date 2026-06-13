# Integrantes del equipo

Contrato para que el frontend registre y valide integrantes del equipo de desarrollo sin exponer codigos esperados.

## Listar integrantes

```http
GET /api/integrantes
```

Respuesta:

```json
{
  "data": [
    {
      "id": "Akczul",
      "seudonimo": "Akczul",
      "grupo": "backend"
    }
  ],
  "total": 4
}
```

Valores posibles de `grupo`:

```text
backend
frontend
```

El endpoint no devuelve nombres reales ni codigos privados. La UI debe mostrar los integrantes agrupados por `grupo`.

## Validar identificador

```http
POST /api/integrantes/validar
Content-Type: application/json
```

Body:

```json
{
  "seudonimo": "JDav117",
  "identificador": "123"
}
```

Tambien puede enviarse el nombre real:

```json
{
  "nombreCompleto": "Jhoan David Ortega Ramos",
  "identificador": "123"
}
```

El request debe incluir `seudonimo` o `nombreCompleto`, mas `identificador`. `identificador` debe tener exactamente 3 digitos y corresponde al codigo rotativo vigente generado por el backend. El frontend no debe calcular, guardar ni mostrar codigos esperados.

Respuesta exitosa:

```json
{
  "valido": true,
  "codigo": "INTEGRANTE_VALIDADO",
  "mensaje": "Integrante validado correctamente",
  "integrante": {
    "id": "JDav117",
    "seudonimo": "JDav117",
    "nombreCompleto": "Jhoan David Ortega Ramos",
    "grupo": "frontend"
  }
}
```

Respuesta no valida:

```json
{
  "valido": false,
  "codigo": "INTEGRANTE_NO_VALIDO",
  "mensaje": "No se pudo validar el integrante con los datos ingresados"
}
```

Errores de formato devuelven `400` con `codigo: "PARAMETROS_INVALIDOS"`.

## Registrar integrante

```http
POST /api/integrantes
Content-Type: application/json
```

Body:

```json
{
  "seudonimo": "NuevoDev",
  "nombreCompleto": "Nuevo Integrante",
  "grupo": "frontend",
  "codigoRegistro": "A1B2C3D4E5"
}
```

`grupo` solo acepta:

```text
backend
frontend
```

`codigoRegistro` es obligatorio. Lo genera un administrador desde el dashboard y se consume una sola vez al registrar el integrante.

Respuesta:

```json
{
  "codigo": "INTEGRANTE_REGISTRADO",
  "mensaje": "Integrante registrado correctamente",
  "codigoIngreso": "123",
  "integrante": {
    "id": "NuevoDev",
    "seudonimo": "NuevoDev",
    "nombreCompleto": "Nuevo Integrante",
    "grupo": "frontend"
  }
}
```

`codigoIngreso` no es el codigo de registro. Es el codigo vigente que el integrante debe usar para validar su ingreso.

El registro valida duplicados por `seudonimo` y `nombreCompleto`. Los integrantes se guardan en la tabla `integrantes_equipo` y los codigos de registro en `integrantes_codigos_registro`.

## Generar codigo de registro

Solo para administradores autenticados.

```http
POST /api/integrantes/codigos
Authorization: Bearer <token_admin>
Content-Type: application/json
```

Respuesta:

```json
{
  "codigo": "CODIGO_REGISTRO_GENERADO",
  "mensaje": "Codigo de registro generado correctamente",
  "codigoRegistro": "A1B2C3D4E5",
  "expira_en": "2026-06-14T15:00:00.000Z",
  "expira_en_segundos": 86400
}
```

El codigo se muestra completo solo al generarlo. Luego puede consultarse el listado de invitaciones activas sin exponer el valor del codigo:

```http
GET /api/integrantes/codigos
Authorization: Bearer <token_admin>
```

Respuesta:

```json
{
  "data": [
    {
      "id": "uuid",
      "creado_en": "2026-06-13T15:00:00.000Z",
      "expira_en": "2026-06-14T15:00:00.000Z",
      "usado": false,
      "generado_por": "admin@grandstay.com"
    }
  ],
  "total": 1
}
```

## Reglas de UI sugeridas

- Renderizar dos grupos: Backend y Frontend.
- Usar `id` o `seudonimo` como valor interno del selector.
- En la vista publica de ingreso, usar un campo generico de identidad y enviar `{ "integrante": "...", "identificador": "123" }`.
- Para registro nuevo, enviar `seudonimo`, `nombreCompleto`, `grupo` y `codigoRegistro`.
- El dashboard administrador debe generar codigos de registro; no debe registrar integrantes manualmente sin invitacion.
- No guardar, calcular ni mostrar codigos esperados en el cliente.
- Limitar el campo `identificador` a 3 digitos numericos.
- Mostrar `mensaje` directamente al usuario.

## Rotacion del codigo

El codigo cambia cada 1 dia y se valida unicamente en backend con `INTEGRANTES_CODE_SECRET`.
Por tolerancia de reloj, el backend acepta el codigo vigente y el de la ventana inmediatamente anterior.

## Obtener codigo vigente en desarrollo

Para pruebas locales o Postman, existe un endpoint de depuracion. No responde en `NODE_ENV=production`.

```http
GET /api/integrantes/JDav117/codigo
```

Respuesta:

```json
{
  "id": "JDav117",
  "seudonimo": "JDav117",
  "nombreCompleto": "Jhoan David Ortega Ramos",
  "grupo": "frontend",
  "identificador": "123",
  "vigente_hasta": "2026-06-14T00:00:00.000Z",
  "expira_en_segundos": 43200
}
```

## Seudonimos configurados

```text
Backend: Akczul, Alexsters
Frontend: JDav117, Pan
```
