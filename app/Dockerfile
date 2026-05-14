FROM node:22-alpine

WORKDIR /app

# Evita el prompt de descarga de Corepack al instalar pnpm desde packageManager
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Copiar PRIMERO solo los archivos de dependencias.
# Docker cachea capas: si estos archivos no cambian,
# no reinstala dependencias en cada build. Esto ahorra tiempo.
# .npmrc viaja aquí porque define defensas (ignore-scripts) que aplican durante la instalación.
COPY package.json pnpm-lock.yaml .npmrc ./

# Activar pnpm vía Corepack (incluido en Node 22+) usando la versión fijada en
# el campo "packageManager" del package.json, y luego instalar dependencias de producción
# con el lockfile congelado. --ignore-scripts refuerza la defensa contra scripts
# maliciosos en preinstall/postinstall (mitiga incidentes tipo TanStack 2026).
RUN corepack enable \
 && pnpm install --frozen-lockfile --prod --ignore-scripts

# Copiar el resto del código fuente
COPY . .

# Documentar el puerto que usa la app (solo documenta) no expone
EXPOSE 3000

# Comando que se ejecuta cuando el contenedor arranca
CMD ["node", "src/index.js"]
