# Imagen base fijada por digest (no solo por tag mutable): garantiza builds
# reproducibles y bloquea que un tag repintado introduzca contenido distinto.
# Actualizar el digest es un cambio explícito y revisable (lo gestiona Dependabot).
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920

WORKDIR /app

# Evita el prompt de descarga de Corepack al instalar pnpm desde packageManager
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NODE_ENV=production

# Copiar PRIMERO solo los archivos de dependencias.
# Docker cachea capas: si estos archivos no cambian,
# no reinstala dependencias en cada build. Esto ahorra tiempo.
# pnpm-workspace.yaml viaja aquí porque define las defensas reales de pnpm 11
# (overrides, minimumReleaseAge, strictDepBuilds). Sin él, la instalación frozen
# falla por mismatch de overrides contra el lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Activar pnpm vía Corepack (incluido en Node 22+) usando la versión fijada en
# el campo "packageManager" del package.json, y luego instalar dependencias de producción
# con el lockfile congelado. --ignore-scripts refuerza la defensa contra scripts
# maliciosos en preinstall/postinstall (mitiga incidentes tipo TanStack 2026).
RUN corepack enable \
 && pnpm install --frozen-lockfile --prod --ignore-scripts

# Copiar el resto del código fuente con ownership del usuario no-root.
COPY --chown=node:node . .

# Correr como usuario no-root (viene incluido en la imagen node:alpine).
USER node

# Documentar el puerto que usa la app (solo documenta) no expone
EXPOSE 3000

# Healthcheck integrado: usa readiness (/health/ready) para que el contenedor
# se marque healthy solo cuando además puede hablar con PostgreSQL. wget viene
# con alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/ready >/dev/null 2>&1 || exit 1

# Comando que se ejecuta cuando el contenedor arranca
CMD ["node", "src/server.js"]
