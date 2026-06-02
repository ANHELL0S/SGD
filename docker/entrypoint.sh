#!/bin/bash
set -e

# Regenerar .env con comillas correctas desde las variables del contenedor.
# Dokploy puede generar el .env del build context sin comillas para valores
# con espacios (ej: APP_NAME=Sistema de Gestion), lo que rompe phpdotenv.
# docker-compose env_file ya parseo correctamente las variables de entorno,
# asi que las tomamos de ahi y las escribimos bien entrecomilladas.
env | grep -E '^(APP_|DB_|SESSION_|BROADCAST_|QUEUE_|CACHE_|REVERB_|MAIL_|VITE_|FILESYSTEM_|LOG_|BCRYPT_|TESSERACT_|OCR_|PUSHER_)' | \
    awk -F'=' '{key=$1; val=substr($0, length($1)+2); printf "%s=\"%s\"\n", key, val}' \
    > /var/www/html/.env

# Esperar a que PostgreSQL acepte conexiones
echo "[entrypoint] Esperando a PostgreSQL..."
until php -r "new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
    echo "[entrypoint] PostgreSQL no disponible, reintentando en 2s..."
    sleep 2
done
echo "[entrypoint] PostgreSQL listo."

# Sincronizar assets compilados al volumen compartido con Nginx
echo "[entrypoint] Copiando assets públicos..."
cp -rf /var/www/html/public-dist/. /var/www/html/public/

# Crear enlace simbólico de storage (idempotente)
echo "[entrypoint] Creando storage link..."
php artisan storage:link --quiet 2>/dev/null || true

# Ejecutar migraciones y seed inicial (AdminSeeder usa updateOrCreate, es idempotente)
echo "[entrypoint] Ejecutando migraciones..."
php artisan migrate --force
echo "[entrypoint] Ejecutando seeders..."
php artisan db:seed --force || echo "[entrypoint] ADVERTENCIA: seeder falló, continuando..."

# Optimizar para producción
echo "[entrypoint] Optimizando..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "[entrypoint] Iniciando PHP-FPM..."
exec "$@"
