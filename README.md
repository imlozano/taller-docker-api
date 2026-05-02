# Tasks API — Taller Docker Compose 🐳

API REST para gestión de tareas construida con **Node.js + Express + PostgreSQL**, desplegada con **Docker Compose** e integrada con **GitLab CI/CD**.

## Arquitectura

![Arquitectura](image.png)

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
git clone https://gitlab.com/imlozano/taller-docker-api.git
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
| GET | `/health` | Estado del servidor (incluye version y environment) |
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
| `DB_HOST` | Host de la BD | `db` |
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

La aplicación está desplegada en DigitalOcean con despliegue automático.

**URL pública:** `http://134.199.218.201:3000`

---

## 🚀 Pipeline de CI/CD

Este proyecto cuenta con un pipeline de Integración Continua y Despliegue Continuo (CI/CD) configurado en **GitLab CI/CD**, definido en el archivo `.gitlab-ci.yml` ubicado en la raíz del repositorio.

### ¿Cómo se activa?

El pipeline **se dispara automáticamente** ante cualquier `git push` al repositorio. El estado del pipeline (éxito o fallo) es visible en la sección **Build -> Pipelines** de GitLab.

No requiere ejecución manual. Cada commit empujado a la rama `main` ejecuta el flujo completo, incluyendo el despliegue al servidor de producción.

### ¿Qué hace el pipeline?

El pipeline está organizado en **5 stages secuenciales** que validan el código y lo despliegan automáticamente:

| Stage | Job | Descripción |
|---|---|---|
| 1. `install` | `install_dependencies` | Instala las dependencias usando `npm ci` (modo estricto basado en `package-lock.json`). Genera artefactos `node_modules` reutilizables por los siguientes jobs. |
| 2. `audit` | `security_audit` | Ejecuta `npm audit --audit-level=high --omit=dev` para detectar vulnerabilidades de seguridad altas o críticas en dependencias de producción. |
| 3. `lint` | `code_lint` | Ejecuta ESLint con reglas configuradas (`eqeqeq`, `quotes single`, `no-unused-vars`) para validar la calidad y consistencia del código JavaScript. |
| 4. `build` | `docker_build` | Construye la imagen Docker (`docker build`) usando Docker-in-Docker (`docker:24-dind`) para validar que el `Dockerfile` es funcional y reproducible. |
| 5. `deploy` | `deploy_to_production` | Despliega los cambios al servidor de producción (DigitalOcean) vía SSH. Solo se ejecuta en la rama `main` y si todos los stages anteriores pasaron correctamente. |

### Flujo del despliegue automático (stage `deploy`)

1. Configura el cliente SSH usando la llave privada inyectada desde Variables Protegidas.
2. Se conecta al servidor mediante `ssh $DEPLOY_USER@$DEPLOY_HOST`.
3. En el servidor, ejecuta:
   - `git pull origin main` para traer los últimos cambios.
   - `docker compose down` para detener los contenedores actuales.
   - `docker compose up -d --build` para reconstruir y levantar la nueva versión.
4. Verifica el estado de los contenedores con `docker ps`.

### Variables Protegidas de GitLab

Las credenciales sensibles **nunca están hardcodeadas** en el pipeline. Se gestionan desde **Settings → CI/CD → Variables** en GitLab:

| Variable | Tipo | Flag | Uso |
|---|---|---|---|
| `SSH_PRIVATE_KEY` | File | Protected | Llave SSH privada para autenticarse al servidor |
| `DEPLOY_USER` | Variable | Protected | Usuario SSH del servidor (`root`) |
| `DEPLOY_HOST` | Variable | Protected | IP pública del servidor |

El flag `Protected` asegura que estas variables solo se exponen en pipelines ejecutados sobre ramas protegidas (como `main`), evitando que ramas no autorizadas accedan a credenciales.

### Configuración de seguridad adicional

El proyecto incluye protecciones contra ataques de cadena de suministro de npm (relevantes en 2026):

- **`.npmrc`** con `ignore-scripts=true` para mitigar ataques tipo Axios (marzo 2026) y Mini Shai-Hulud (abril 2026).
- **`save-exact=true`** para fijar versiones exactas y evitar auto-actualizaciones a versiones potencialmente comprometidas.
- **`package-lock.json`** comprometido en el repositorio para builds reproducibles.

El servidor de producción cuenta con:
- **UFW firewall** configurado.
- **fail2ban** monitoreando intentos de autenticación SSH.
- **Llave SSH dedicada** exclusivamente para el deploy automatizado.

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