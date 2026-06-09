# Imagen base fijada por digest (no solo por tag mutable): garantiza builds
# reproducibles y bloquea que un tag repintado introduzca contenido distinto.
# Actualizar el digest es un cambio explícito y revisable (lo gestiona Dependabot).

# ── Stage 1: dependencias ──────────────────────────────────────────────────
# Aquí vive todo el tooling de instalación (corepack/pnpm y sus cachés).
# Nada de esto llega a la imagen final.
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 AS deps

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

# ── Stage 2: runtime ───────────────────────────────────────────────────────
# Alpine puro + SOLO el binario de node copiado del stage anterior. Así la
# imagen final no lleva npm, npx, corepack ni yarn (la copia de npm de la
# imagen node:alpine arrastra CVEs, p. ej. picomatch ReDoS, y borrarla en una
# capa posterior no reduce tamaño ni la saca de las capas base). Resultado:
# ~170MB frente a los ~270MB de la imagen single-stage.
FROM alpine:3.22@sha256:310c62b5e7ca5b08167e4384c68db0fd2905dd9c7493756d356e893909057601

WORKDIR /app

ENV NODE_ENV=production

# node es un binario casi estático: solo necesita libstdc++/libgcc del sistema.
RUN apk add --no-cache libstdc++ libgcc \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -s /bin/sh -D node

COPY --from=deps /usr/local/bin/node /usr/local/bin/node

COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copiar el resto del código fuente con ownership del usuario no-root.
COPY --chown=node:node . .

# Correr como usuario no-root.
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
