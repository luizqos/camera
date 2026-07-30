# Estágio 1: Build do Vite / React
FROM node:18-alpine AS build
WORKDIR /app

# Copia os arquivos de manifesto
COPY package*.json ./

# Substituído 'npm ci' por 'npm install'
RUN npm install

COPY . .
RUN npm run build

# Estágio 2: Nginx para servir a build do React
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html