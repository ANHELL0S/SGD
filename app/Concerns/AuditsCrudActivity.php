<?php

namespace App\Concerns;

use App\Support\RequestIpResolver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Registra automáticamente en el log toda acción CRUD sobre el modelo que lo usa.
 *
 * Engancha los eventos de Eloquent (created, updated, deleted y, si aplica, restored)
 * para escribir entradas de auditoría en el canal `database`. Los cambios se sanitizan:
 * las marcas de tiempo se omiten, los campos sensibles (password, tokens) se redactan
 * como `[REDACTED]` y los valores de más de 500 caracteres se truncan.
 */
trait AuditsCrudActivity
{
    /**
     * Registra los listeners de Eloquent al arrancar el trait en el modelo.
     * El listener `restored` solo se añade si el modelo usa `SoftDeletes`.
     */
    protected static function bootAuditsCrudActivity(): void
    {
        static::created(function (Model $model): void {
            $model->logCrudAction('created', $model->extractCreatedChanges());
        });

        static::updated(function (Model $model): void {
            $changes = $model->extractUpdatedChanges();

            if ($changes === []) {
                return;
            }

            $model->logCrudAction('updated', $changes);
        });

        static::deleted(function (Model $model): void {
            $model->logCrudAction('deleted');
        });

        if (in_array(SoftDeletes::class, class_uses_recursive(static::class), true)) {
            static::restored(function (Model $model): void {
                $model->logCrudAction('restored');
            });
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function extractCreatedChanges(): array
    {
        $changes = $this->getChanges();

        return $this->sanitizeChanges($changes);
    }

    /**
     * @return array<string, mixed>
     */
    protected function extractUpdatedChanges(): array
    {
        $changes = $this->getChanges();

        return $this->sanitizeChanges($changes);
    }

    /** Canal de log donde se escriben las entradas de auditoría. */
    protected function auditChannel(): string
    {
        return 'database';
    }

    /** Nombre corto en minúsculas del modelo (ej. 'documento', 'user'). */
    protected function auditEntityName(): string
    {
        return strtolower(class_basename(static::class));
    }

    /** Etiqueta legible en español para el tipo de entidad auditada. */
    protected function auditEntityLabel(): string
    {
        return match ($this->auditEntityName()) {
            'area' => 'Área',
            'remitente' => 'Remitente',
            'documento' => 'Documento',
            'user' => 'Usuario',
            default => 'Registro',
        };
    }

    /** Devuelve 'warning' para acciones destructivas (updated/deleted) e 'info' para el resto. */
    protected function auditLevel(string $action): string
    {
        return match ($action) {
            'updated', 'deleted' => 'warning',
            default => 'info',
        };
    }

    /** Traducción al español del código de acción para el log. */
    protected function auditActionLabel(string $action): string
    {
        return match ($action) {
            'created' => 'creación',
            'updated' => 'actualización',
            'deleted' => 'eliminación',
            'restored' => 'restauración',
            default => $action,
        };
    }

    /** Mensaje principal de la entrada de log, compuesto por entidad + acción. */
    protected function auditMessage(string $action): string
    {
        return match ([$this->auditEntityName(), $action]) {
            ['area', 'created'] => 'Área creada',
            ['area', 'updated'] => 'Área actualizada',
            ['area', 'deleted'] => 'Área eliminada',
            ['area', 'restored'] => 'Área restaurada',

            ['remitente', 'created'] => 'Remitente creado',
            ['remitente', 'updated'] => 'Remitente actualizado',
            ['remitente', 'deleted'] => 'Remitente eliminado',
            ['remitente', 'restored'] => 'Remitente restaurado',

            ['documento', 'created'] => 'Documento creado',
            ['documento', 'updated'] => 'Documento actualizado',
            ['documento', 'deleted'] => 'Documento eliminado',
            ['documento', 'restored'] => 'Documento restaurado',

            ['user', 'created'] => 'Usuario creado',
            ['user', 'updated'] => 'Usuario actualizado',
            ['user', 'deleted'] => 'Usuario eliminado',
            ['user', 'restored'] => 'Usuario restaurado',

            default => 'Registro actualizado',
        };
    }

    /**
     * Escribe la entrada de auditoría en el canal de log con contexto de IP, usuario y ruta HTTP.
     *
     * @param string               $action  Código del evento de Eloquent (created|updated|deleted|restored).
     * @param array<string, mixed> $changes Mapa de cambios ya sanitizados; vacío para deleted/restored.
     */
    private function logCrudAction(string $action, array $changes = []): void
    {
        $request = request();
        $actorId = Auth::id();
        $level = $this->auditLevel($action);
        $ipContext = RequestIpResolver::resolve($request);

        Log::channel($this->auditChannel())->{$level}($this->auditMessage($action), [
            'modulo' => 'auditoria',
            'accion' => $this->auditActionLabel($action),
            'accion_codigo' => $action,
            'entidad' => $this->auditEntityName(),
            'tabla' => $this->getTable(),
            'registro_llave' => $this->getKeyName(),
            'registro_id' => $this->getKey(),
            'changes' => $changes,
            'user_id' => is_numeric($actorId) ? (int) $actorId : null,
            ...$ipContext,
            'method' => $request?->method(),
            'route' => $request?->route()?->getName(),
        ]);
    }

    /**
     * Filtra y normaliza el array de cambios para el log:
     * - Omite marcas de tiempo (`created_at`, `updated_at`, `deleted_at`).
     * - Sustituye campos sensibles (password, tokens 2FA) por `[REDACTED]`.
     * - Trunca strings de más de 500 caracteres para evitar logs excesivamente grandes.
     *
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    private function sanitizeChanges(array $changes): array
    {
        $ignoredKeys = [
            $this->getUpdatedAtColumn(),
            $this->getCreatedAtColumn(),
            method_exists($this, 'getDeletedAtColumn') ? $this->getDeletedAtColumn() : null,
        ];

        $sensitiveKeys = [
            'password',
            'remember_token',
            'two_factor_secret',
            'two_factor_recovery_codes',
        ];

        $sanitized = [];

        foreach ($changes as $key => $value) {
            if (in_array($key, $ignoredKeys, true)) {
                continue;
            }

            if (in_array($key, $sensitiveKeys, true)) {
                $sanitized[$key] = '[REDACTED]';

                continue;
            }

            $sanitized[$key] = $this->normalizeAuditValue($value);
        }

        return $sanitized;
    }

    /**
     * Convierte cualquier valor a una forma segura para JSON: arrays de forma recursiva,
     * objetos sin `__toString` a `['object' => FQN]`, resources al string `'resource'`.
     */
    private function normalizeAuditValue(mixed $value): mixed
    {
        if (is_array($value)) {
            return array_map(fn (mixed $item): mixed => $this->normalizeAuditValue($item), $value);
        }

        if (is_string($value) && strlen($value) > 500) {
            return substr($value, 0, 500).'...';
        }

        if (is_object($value)) {
            if (method_exists($value, '__toString')) {
                return $this->normalizeAuditValue((string) $value);
            }

            return ['object' => $value::class];
        }

        if (is_resource($value)) {
            return 'resource';
        }

        return $value;
    }
}
