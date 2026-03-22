FROM node:20-alpine

WORKDIR /app

# Copiar PRIMERO solo los archivos de dependencias.
# Docker cachea capas: si package.json no cambió,
# no reinstala dependencias en cada build. Esto ahorra tiempo
COPY package*.json ./

# Instalar solo dependencias de producción.
# --omit=dev excluye nodemon y otras herramientas de desarrollo
RUN npm install --omit=dev

# Copiar el resto del código fuente
COPY . .

# Documentar el puerto que usa la app (solo documenta) no expone
EXPOSE 3000

# Comando que se ejecuta cuando el contenedor arranca
CMD ["node", "src/index.js"]