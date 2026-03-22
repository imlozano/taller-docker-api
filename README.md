# Tasks API — Taller Docker Compose 🐳

API REST para gestión de tareas construida con **Node.js + Express + PostgreSQL**, desplegada con **Docker Compose**.

## Arquitectura

![alt text](image.png)

```
┌─────────────────────────────────────────┐
│           Docker Compose                │
│                                         │
│  ┌──────────────┐    ┌───────────────┐  │
│  │  tasks-api   │───▶│   tasks-db    │  │
│  │  Node.js     │    │  PostgreSQL   │  │
│  │  :3000       │    │  :5432        │  │
│  └──────────────┘    └───────────────┘  │
│         │                   │           │
│         └────app-network────┘           │
│                    │                    │
│            postgres-data (volumen)      │
└─────────────────────────────────────────┘
```

## Servicios

| Servicio | Imagen | Puerto | Descripción |
|---|---|---|---|
| `tasks-api` | Node.js 20 Alpine | 3000 | API REST |
| `tasks-db` | PostgreSQL 16 Alpine | 5432 (interno) | Base de datos |

## Correr localmente

### Prerrequisitos
- Docker Desktop instalado
- Git

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/TU-USUARIO/taller-docker-api.git
cd taller-docker-api

# 2. Crear el archivo de variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Levantar los contenedores
docker compose up --build

# 4. Verificar que funciona
curl http://localhost:3000/health
```

## 🔌 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servidor |
| GET | `/tasks` | Listar todas las tareas |
| GET | `/tasks/:id` | Obtener tarea por ID |
| POST | `/tasks` | Crear tarea |
| PUT | `/tasks/:id` | Actualizar tarea |
| DELETE | `/tasks/:id` | Eliminar tarea |

### Ejemplos
```bash
# Crear tarea
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Mi nueva tarea"}'

# Listar tareas
curl http://localhost:3000/tasks

# Marcar como completada
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Eliminar tarea
curl -X DELETE http://localhost:3000/tasks/1
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de la BD (nombre del servicio) | `db` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `tasksdb` |
| `DB_USER` | Usuario de PostgreSQL | `taskuser` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `supersecret` |

> ⚠️ Nunca subir el archivo `.env` al repositorio.

## Persistencia de datos

Los datos de PostgreSQL se almacenan en el volumen `postgres-data`. Al ejecutar `docker compose down`, los datos **no se eliminan**. Solo se eliminan con:
```bash
docker compose down -v  # El flag -v elimina los volúmenes
```

## Despliegue

La aplicación está desplegada en DigitalOcean.

**URL pública:** `http://TU-IP-AQUI:3000`

## Comandos útiles
```bash
# Levantar en segundo plano
docker compose up -d

# Ver logs
docker compose logs -f

# Apagar contenedores
docker compose down

# Ver contenedores corriendo
docker ps
```