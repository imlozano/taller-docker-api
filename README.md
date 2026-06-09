# Tasks API — Taller Docker Compose 🐳

API REST para gestión de tareas construida con **Node.js 22 + Express 5 + PostgreSQL 16**,
desplegada con **Docker Compose** detrás de **Caddy** (TLS automático) e integrada con
**GitLab CI/CD** (tests, escaneo de imagen y despliegue con rollback automático).

## Arquitectura

![Arquitectura](image.png)

```
                    Internet (HTTPS)
                          │
                          ▼
        ┌───────────────────────────────────────────┐
        │              Docker Compose                │
        │                                            │
        │   ┌─────────┐   ┌──────────┐  ┌─────────┐  │
        │   │  Caddy  │──▶│ tasks-api│─▶│ tasks-db│  │
        │   │ :80/:443│   │ Node :3000│  │ PG :5432│  │
        │   │  TLS    │   └──────────┘  └─────────┘  │
        │   └─────────┘        │             │       │
        │        └────── app-network ────────┘       │
        │                      │                     │
        │             postgres-data (volumen)        │
        └───────────────────────────────────────────┘
                          ▲
                Grafana Alloy raspa /metrics
                (directo al contenedor, sin proxy)
```

- **Caddy** termina TLS (HTTPS) y hace de reverse proxy. La API no se expone directamente a
  internet: solo escucha en `127.0.0.1` dentro del host.
- **tasks-api** corre como usuario no-root, con FS de solo lectura y capabilities mínimas.
- **tasks-db** persiste en el volumen `postgres-data`.

## Servicios

| Servicio | Imagen (fijada por digest) | Puerto | Descripción |
|---|---|---|---|
| `tasks-caddy` | `caddy:2-alpine` | 80/443 | Reverse proxy + TLS |
| `tasks-api` | `node:22-alpine` | 3000 (solo `127.0.0.1`) | API REST |
| `tasks-db` | `postgres:16-alpine` | 5432 (interno) | Base de datos |

## Correr localmente

### Prerrequisitos
- Docker Desktop
- Git

### Pasos
```bash
git clone https://gitlab.com/imlozano/taller-docker-api.git
cd taller-docker-api

cp .env.example .env          # editar con tus valores (DB_PASSWORD, etc.)

docker compose up --build     # levanta caddy + api + db
curl http://localhost:3000/health
```

## 🔌 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | **Liveness**: el proceso está vivo (no toca la BD) |
| GET | `/health/ready` | **Readiness**: verifica la BD con `SELECT 1` (200 / 503) |
| GET | `/tasks?limit=&offset=` | Listar tareas paginadas (limit máx 100, def. 50) |
| GET | `/tasks/:id` | Obtener tarea por ID |
| POST | `/tasks` | Crear tarea |
| PUT | `/tasks/:id` | Actualizar tarea (`title` y/o `done`) |
| DELETE | `/tasks/:id` | Eliminar tarea |
| GET | `/metrics` | Métricas Prometheus (solo acceso interno, ver Observabilidad) |

La validación de entrada usa **Zod**; las respuestas de error 5xx ocultan detalles internos y
devuelven un `requestId` (también en la cabecera `X-Request-Id`) para correlacionar con los logs.

### Ejemplos
```bash
# Crear tarea
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Mi nueva tarea"}'

# Listar paginado
curl "http://localhost:3000/tasks?limit=10&offset=0"
# -> { "success": true, "count": 10, "total": 42, "limit": 10, "offset": 0, "data": [...] }

# Marcar como completada
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Eliminar
curl -X DELETE http://localhost:3000/tasks/1
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `LOG_LEVEL` | Nivel de log de pino | `info` |
| `CORS_ORIGIN` | Orígenes permitidos (coma) — **obligatorio en producción** | `https://task-to-do.app` |
| `DB_HOST` | Host de la BD | `db` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `tasksdb` |
| `DB_USER` | Usuario de PostgreSQL | `taskuser` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `supersecret` |

> ⚠️ Nunca subir el archivo `.env` al repositorio.

## Tests

Suite de **integración** (Jest + Supertest) que corre contra un **PostgreSQL efímero real**
(sin mocks de BD): valida el CRUD, la validación Zod, los 404, los bordes de seguridad y el
manejo de errores 5xx. El umbral de cobertura rompe el build si baja.

```bash
cd app
# Postgres desechable para los tests
docker run -d --name pg-test -p 5433:5432 \
  -e POSTGRES_USER=taskuser -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=tasksdb_test \
  postgres:16-alpine

DB_HOST=127.0.0.1 DB_PORT=5433 DB_NAME=tasksdb_test \
DB_USER=taskuser DB_PASSWORD=testpass pnpm test:coverage
```

## Migraciones de base de datos

El esquema se gestiona con **node-pg-migrate** (migraciones versionadas en `app/migrations/`),
no con un `CREATE TABLE` improvisado. Las migraciones pendientes se aplican **automáticamente al
arrancar la API**, antes de aceptar tráfico (no hace falta correr nada a mano en el deploy).

Para ejecutarlas manualmente, el CLI lee `DATABASE_URL`:

```bash
cd app
DATABASE_URL="postgres://taskuser:PASS@127.0.0.1:5432/tasksdb" pnpm migrate up    # aplicar
DATABASE_URL="postgres://taskuser:PASS@127.0.0.1:5432/tasksdb" pnpm migrate down  # revertir
```

## Fiabilidad

- **Graceful shutdown**: ante `SIGTERM`/`SIGINT` (lo que envía `docker compose down`), la API
  deja de aceptar conexiones, drena el pool de PostgreSQL y sale limpio (con timeout de seguridad).
- **Readiness real**: `/health/ready` verifica la BD; el `HEALTHCHECK` de Docker lo usa, así que
  un contenedor solo se marca `healthy` cuando de verdad puede servir tráfico.
- **Paginación**: `GET /tasks` está acotado (`limit` máx 100) para no degradar con el tamaño de
  la tabla.

## Observabilidad

- **Logs estructurados** (JSON) con **pino**: cada request lleva un `requestId` que se propaga al
  log y se devuelve al cliente en los errores 5xx → correlación inmediata.
- **Métricas Prometheus** (`/metrics`, método RED) raspadas por **Grafana Alloy**. El endpoint
  está bloqueado desde internet (Caddy) y rechaza requests con `X-Forwarded-For` (defensa en
  profundidad).
- **Dashboard de Grafana** versionado como código en
  [`observability/`](observability/) (Rate / Errors / Duration + salud del proceso).

## Hardening de contenedores

Cada servicio corre con privilegios mínimos para acotar el *blast radius* ante un compromiso:

- `no-new-privileges`, `cap_drop: ALL` (con solo las capabilities imprescindibles por servicio).
- `tasks-api`: usuario **no-root**, **FS de solo lectura** (`read_only` + `tmpfs` para `/tmp`),
  `pids_limit` y `mem_limit`.
- Imágenes base **fijadas por digest** (`@sha256:…`), no solo por tag mutable.

## Persistencia de datos

Los datos viven en el volumen `postgres-data` y sobreviven a `docker compose down`. Solo se
borran con `docker compose down -v`.

### Backups

`scripts/backup-db.sh` hace un `pg_dump` comprimido del contenedor `tasks-db` a `/root/backups`
con retención de 14 días. En el servidor corre a diario vía cron (`/etc/cron.d/pg-backup`, 03:00 UTC,
log en `/var/log/pg-backup.log`).

```bash
# Backup manual
./scripts/backup-db.sh

# Restore (sobre una BD existente)
gunzip -c /root/backups/tasksdb-YYYY-MM-DD.sql.gz | docker exec -i tasks-db psql -U "$DB_USER" -d "$DB_NAME"
```

## Despliegue

Desplegado en **DigitalOcean** detrás de Caddy con TLS automático. Acceso público vía HTTPS en
el dominio configurado (`api.task-to-do.app`); el puerto 3000 **no** está expuesto a internet.

El servidor cuenta además con **UFW**, **fail2ban** y una **llave SSH dedicada** solo para el
deploy automatizado.

---

## 🚀 Pipeline de CI/CD (GitLab)

Definido en `.gitlab-ci.yml`. Se dispara en cada `git push`; el despliegue solo corre en `main`.

| Stage | Job | Descripción |
|---|---|---|
| 1. `install` | `install_dependencies` | `pnpm install --frozen-lockfile --ignore-scripts`. Artefacto `node_modules` reutilizable. |
| 2. `audit` | `security_audit` | `pnpm audit --audit-level high --prod`: frena ante CVEs altas/críticas en deps. |
| 3. `lint` | `code_lint` | ESLint (`eqeqeq`, `quotes single`, `no-unused-vars`). |
| 4. `test` | `code_test` | **Jest + Supertest** contra un Postgres `service` efímero, con umbral de cobertura. |
| 5. `build` | `docker_build` | Construye la imagen y la exporta como artefacto (`image.tar`). |
| 6. `scan` | `image_scan` | **Trivy** escanea la imagen; falla ante HIGH/CRITICAL con fix. |
| 7. `deploy` | `deploy_to_production` | Deploy SSH a producción con **verificación + rollback** (solo `main`). |

### Despliegue con verificación y rollback

1. Guarda el commit actual (`PREV`) **antes** de sincronizar.
2. `git fetch origin main && git reset --hard origin/main` (idempotente, resiliente a force-push).
3. `docker compose up -d --build`.
4. **Sondea** el estado de salud del contenedor (`tasks-api` → `healthy`, que internamente es la
   readiness contra la BD) con reintentos.
5. Si no llega a `healthy`, hace **rollback automático** al commit `PREV`, reconstruye y marca el
   pipeline en rojo. Sin ventanas de servicio caído por un mal despliegue.

### Variables Protegidas de GitLab

| Variable | Tipo | Uso |
|---|---|---|
| `SSH_PRIVATE_KEY` | File / Protected | Llave SSH privada para el servidor |
| `DEPLOY_USER` / `DEPLOY_HOST` | Protected | Usuario e IP del servidor |
| `SSH_KNOWN_HOSTS` | Protected (recomendado) | Host key fijado del servidor (evita MITM; si falta, se usa `ssh-keyscan` en modo TOFU) |

### Seguridad de la cadena de suministro

Defensa en profundidad contra ataques a la cadena de suministro de npm, en tres capas.

> **Nota sobre pnpm 11:** los settings y `overrides` ya **no** se leen del campo `pnpm` de
> `package.json` ni de `.npmrc` (salvo auth/registry). Toda la configuración vive en
> `app/pnpm-workspace.yaml`, y el `Dockerfile` lo copia explícitamente.

**Capa 1 — Protección del consumidor**
- Scripts de instalación apagados (`--ignore-scripts` + `strictDepBuilds: true`); las pocas deps
  con build se deciden explícitamente (`ignoredBuiltDependencies`).
- Versiones **exactas** (sin rangos `^`).
- **Cooldown** (`minimumReleaseAge: 4320`): ignora versiones con menos de 3 días.

**Capa 2 — Gestor de paquetes (pnpm)**
- Store centralizado con symlinks; `overrides` para fijar subdeps seguras (p. ej. `qs`).
- **Lockfile estricto** (`--frozen-lockfile`) en CI y en el build de Docker.

**Capa 3 — Auditoría y escaneo en CI**
- `pnpm audit` (deps) **+ Trivy** (imagen completa, incluido el SO base) en cada push.

## Comandos útiles
```bash
docker compose up -d            # segundo plano
docker compose logs -f          # logs
docker compose down             # apagar (conserva datos)
docker ps                       # contenedores corriendo

cd app && pnpm test:coverage    # tests + cobertura
cd app && pnpm lint             # estilo
```
