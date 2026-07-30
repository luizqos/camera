# Estágio 1: Build do Vite / React
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Estágio 2: Imagem do Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html