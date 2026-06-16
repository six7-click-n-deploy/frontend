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

# Apply outstanding base-image security patches that the upstream
# `nginx:alpine` tag hasn't picked up yet (Trivy scans the runtime
# image — anything HIGH/CRITICAL here blocks the push).
RUN apk upgrade --no-cache && \
    apk add --no-cache "libcrypto3>=3.5.7-r0" "libssl3>=3.5.7-r0" || \
    apk upgrade --no-cache libcrypto3 libssl3

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