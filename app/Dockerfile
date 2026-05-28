FROM node:22-alpine

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

# Healthcheck integrado: docker compose puede esperar a que /health responda
# antes de marcar el contenedor como healthy. wget viene con alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null 2>&1 || exit 1

# Comando que se ejecuta cuando el contenedor arranca
CMD ["node", "src/index.js"]
