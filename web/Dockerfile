# Estágio 1: Build do Vite / React
FROM node:18-alpine AS build
WORKDIR /app

# Recebe as variáveis passadas pelo docker-compose
ARG VITE_GO2RTC_PORT
ARG VITE_PUBLISH_IN=LOCAL

# Injeta as variáveis para o processo do Node/Vite
ENV VITE_GO2RTC_PORT=$VITE_GO2RTC_PORT
ENV VITE_PUBLISH_IN=$VITE_PUBLISH_IN

# Copia os arquivos de manifesto
COPY package*.json ./

# Substituído 'npm ci' por 'npm install'
RUN npm install

COPY . .
RUN npm run build

# Estágio 2: Nginx para servir a build do React
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html