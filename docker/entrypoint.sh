#!/bin/bash
set -e

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

# Ejecutar migraciones
echo "[entrypoint] Ejecutando migraciones..."
php artisan migrate --force

# Optimizar para producción
echo "[entrypoint] Optimizando..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "[entrypoint] Iniciando PHP-FPM..."
exec "$@"
