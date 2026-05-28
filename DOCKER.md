# Grand-Stay Backend - Docker

## Requisitos

- Docker 20.10+
- Docker Compose v2+
- Archivo `.env` local basado en `.env.example`

## Modos De Ejecucion

### Backend Con Base De Datos Aiven

Usa este modo cuando `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_SSL_MODE=REQUIRED` apuntan a Aiven.

```bash
docker compose up -d --build grandstay-backend
```

### Backend Con MySQL Local

Usa este modo si quieres levantar tambien el contenedor MySQL local del proyecto.

```bash
docker compose --profile local-db up -d --build
```

## Acceso A MySQL Local

```bash
docker exec -it grandstay-mysql mysql -u grandstay_user -p grandstay_db
docker exec -it grandstay-mysql mysql -u grandstay_user -p grandstay_db -e "SELECT id_usuario, email FROM usuarios;"
```

## Endpoints

- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/health
- Swagger UI: http://localhost:4000/api-docs

## Variables Criticas

| Variable | Uso |
| --- | --- |
| DB_HOST | Host MySQL local o Aiven |
| DB_PORT | Puerto MySQL |
| DB_NAME | Base de datos |
| DB_USER | Usuario de conexion |
| DB_PASSWORD | Password de conexion |
| DB_SSL_MODE | `REQUIRED` para Aiven, `DISABLED` local |
| JWT_SECRET | Secreto JWT, minimo 32 caracteres |
| MYSQL_ROOT_PASSWORD | Solo para MySQL local con perfil `local-db` |

No subir archivos `.env` ni credenciales reales al repositorio.
