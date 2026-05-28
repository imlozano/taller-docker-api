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
| 1. `install` | `install_dependencies` | Instala las dependencias con `pnpm install --frozen-lockfile --ignore-scripts` (lockfile estricto y sin scripts de lifecycle). Genera artefactos `node_modules` reutilizables por los siguientes jobs. |
| 2. `audit` | `security_audit` | Ejecuta `pnpm audit --audit-level high --prod` para detectar vulnerabilidades de seguridad altas o críticas en dependencias de producción. |
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

### Seguridad de la cadena de suministro

Apliqué una estrategia de defensa en profundidad contra ataques a la cadena de suministro de npm (instalar un paquete comprometido ejecuta código en mi máquina, el CI y producción). Está organizada en tres capas.

> **Nota importante sobre pnpm 11:** los settings de pnpm ya **no** se leen del campo `pnpm` de `package.json` ni de `.npmrc` (salvo auth/registry). Toda la configuración de seguridad vive en `app/pnpm-workspace.yaml`, y el `Dockerfile` lo copia explícitamente para que las defensas apliquen también dentro del contenedor.

#### Capa 1 — Protección del consumidor

- **Scripts de instalación apagados.** La instalación corre con `--ignore-scripts` (en el `Dockerfile` y en el CI) y los builds de dependencias están bloqueados por `strictDepBuilds: true`. Los ataques recientes (p. ej. Shai-Hulud) se propagan vía scripts `preinstall`/`postinstall`; al no ejecutarlos, un paquete malicioso no corre código al instalarse.
- **Versiones exactas.** Todas las dependencias están pineadas a una versión exacta (sin rangos `^`). Así controlo exactamente qué entra y evito saltos automáticos a una versión recién publicada y potencialmente comprometida.
- **Cooldown (`minimumReleaseAge: 4320`).** pnpm ignora cualquier versión publicada hace menos de 3 días. Es la ventana en la que un paquete comprometido todavía no fue detectado ni retirado del registry.

#### Capa 2 — Gestor de paquetes (pnpm)

- **pnpm** por su store centralizado con enlaces simbólicos, que aísla mejor el árbol de dependencias.
- **`strictDepBuilds: true` + builds explícitos.** Ningún paquete puede correr scripts de build durante la instalación salvo aprobación manual (`pnpm approve-builds`). La instalación falla si una dependencia con scripts no tiene una decisión explícita.
- **`overrides`.** Fuerzo una versión segura de subdependencias en todo el árbol (p. ej. `qs`), sin depender de lo que resuelvan las dependencias directas.
- **Lockfile estricto.** `--frozen-lockfile` en CI y en el build de Docker: la instalación falla si el lockfile no coincide con `package.json`, garantizando builds reproducibles y bloqueando manipulaciones del lockfile.

#### Capa 3 — Auditoría en CI

- El stage `audit` ejecuta `pnpm audit --audit-level high --prod` en cada push, frenando el pipeline ante vulnerabilidades altas o críticas en dependencias de producción.

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