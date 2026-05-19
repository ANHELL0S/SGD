# ─────────────────────────────────────────────
# Etapa 1: Generar archivos de Wayfinder con PHP
# ─────────────────────────────────────────────
FROM php:8.3-cli-alpine AS php-wayfinder

RUN apk add --no-cache git zip unzip libpq-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql mbstring

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction --quiet

COPY . .

# .env mínimo para que artisan arranque durante el build (evita errores de parsing
# cuando el orquestador inyecta APP_NAME con espacios sin comillas)
RUN printf 'APP_NAME=build\nAPP_ENV=production\nAPP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\nDB_CONNECTION=sqlite\n' > .env

# Generar los archivos de rutas/acciones para el frontend
RUN php artisan wayfinder:generate --with-form

# ─────────────────────────────────────────────
# Etapa 2: Build del frontend (React + Vite)
# ─────────────────────────────────────────────
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Copiar archivos pre-generados por Wayfinder desde la etapa PHP
COPY --from=php-wayfinder /app/resources/js/actions ./resources/js/actions
COPY --from=php-wayfinder /app/resources/js/routes  ./resources/js/routes
COPY --from=php-wayfinder /app/resources/js/wayfinder ./resources/js/wayfinder

# Variables para Vite (se pasan como build args desde docker-compose)
ARG VITE_APP_NAME
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ARG VITE_REVERB_SCHEME
ARG VITE_PUSHER_APP_KEY
ARG VITE_PUSHER_APP_CLUSTER

ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME \
    VITE_PUSHER_APP_KEY=$VITE_PUSHER_APP_KEY \
    VITE_PUSHER_APP_CLUSTER=$VITE_PUSHER_APP_CLUSTER \
    WAYFINDER_CMD=true

RUN npm run build

# ─────────────────────────────────────────────
# Etapa 3: Aplicación PHP (imagen final)
# ─────────────────────────────────────────────
FROM php:8.3-fpm-bookworm

# Dependencias del sistema + Tesseract OCR + extensiones PHP
RUN apt-get update && apt-get install -y --no-install-recommends \
        git curl zip unzip \
        libpng-dev libpq-dev libzip-dev \
        libonig-dev libxml2-dev \
        tesseract-ocr tesseract-ocr-spa \
    && docker-php-ext-install \
        pdo pdo_pgsql pgsql \
        mbstring exif pcntl bcmath gd zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

COPY . .
COPY --from=frontend /app/public/build ./public/build

# Guardar copia de public para el entrypoint (se sincroniza al volumen compartido)
RUN cp -r /var/www/html/public /var/www/html/public-dist

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
