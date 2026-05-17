# Grand-Stay Backend - Docker

## Requisitos

- Docker 20.10+
- Docker Compose v2+

## Estructura

```
Backend/
├── Dockerfile              # Multi-stage build optimizado
├── docker-compose.yml      # Backend + MySQL con seed
├── .dockerignore
├── docker/
│   ├── init.sql           # Esquema de base de datos
│   └── seed.sql           # Datos de prueba
└── ...
```

## Uso

### Desarrollo standalone (solo backend + MySQL)

```bash
# Iniciar servicios
docker compose up -d

# Ver logs
docker compose logs -f backend

# Ver logs de MySQL
docker compose logs -f mysql

# Detener servicios
docker compose down

# Detener y eliminar volumen de datos
docker compose down -v
```

### Acceso a la base de datos

```bash
# Conectar al container MySQL
docker exec -it grandstay-mysql mysql -u grandstay_user -pGrandStay2025! grandstay_db

# Ejecutar query
docker exec -it grandstay-mysql mysql -u grandstay_user -pGrandStay2025! grandstay_db -e "SELECT * FROM usuarios;"
```

## Endpoints

- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/health
- Swagger UI: http://localhost:4000/api-docs

## Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@grandstay.com | Password123! |
| Recepcion | recepcion@grandstay.com | Password123! |
| Limpieza | limpieza@grandstay.com | Password123! |
| Huesped | huesped1@grandstay.com | Password123! |

## Variables de Entorno

| Variable | Default | Descripcion |
|----------|---------|-------------|
| DB_PASSWORD | GrandStay2025! | Password de MySQL |
| JWT_SECRET | clave_desarrollo... | Secreto para JWT |
| JWT_EXPIRES_IN | 8h | Expiracion del token |
| MYSQL_ROOT_PASSWORD | root_password | Password root MySQL |
