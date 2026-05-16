# Docker Backend Grand-Stay

Este repositorio se dockeriza de forma independiente porque `Backend` y `Frontend` son repos separados.

## Levantar

```powershell
docker compose up -d --build
```

## Puertos

- API: http://localhost:4000
- Health: http://localhost:4000/health

## Variables

Puedes crear un archivo `.env` junto a `docker-compose.yml`:

```env
DB_HOST=host.docker.internal
DB_PORT=3306
DB_NAME=grandstay_db
DB_USER=root
DB_PASSWORD=
JWT_SECRET=clave_segura_minimo_32_caracteres
JWT_EXPIRES_IN=8h
```

## Logs

```powershell
docker compose logs -f
```

## Detener

```powershell
docker compose down
```
