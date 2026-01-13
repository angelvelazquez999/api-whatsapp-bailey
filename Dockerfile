# Imagen base Node.js 22 LTS Alpine (ligera)
FROM node:22-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código fuente
COPY src ./src

# Crear directorio de sesiones
RUN mkdir -p sessions

# Puerto expuesto
EXPOSE 3214

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3214

# Comando de inicio
CMD ["node", "src/index.js"]
