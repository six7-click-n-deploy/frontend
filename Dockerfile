# ===============================
# Build Stage
# ===============================
FROM node:20-alpine AS build

WORKDIR /app

# Nur Abhängigkeiten für sauberes Caching
COPY package*.json ./
RUN npm install

# Restlichen Code kopieren
COPY . .

# Production Build erzeugen
RUN npm run build


# ===============================
# Runtime Stage (Nginx)
# ===============================
FROM nginx:alpine

# Default Nginx Config entfernen
RUN rm /etc/nginx/conf.d/default.conf

# Eigene SPA-Config kopieren
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Gebautes Frontend übernehmen
COPY --from=build /app/dist /usr/share/nginx/html

# Entrypoint: ersetzt Platzhalter in env-config.js mit echten Env-Vars
COPY docker-entrypoint.sh /docker-entrypoint.d/00-env-config.sh
RUN chmod +x /docker-entrypoint.d/00-env-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]