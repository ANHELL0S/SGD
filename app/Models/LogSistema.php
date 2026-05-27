<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de actividad del sistema almacenado en la tabla `logs`.
 *
 * Captura eventos HTTP (método, endpoint, status, tiempo) y otros tipos de log.
 * El campo `contexto` (JSON) guarda IP, user-agent, referrer y URL completa.
 * No usa `updated_at`; `created_at` se gestiona manualmente (`timestamps = false`).
 *
 * @property int         $id_log
 * @property string      $tipo            Tipo de log: 'http', etc.
 * @property string      $mensaje
 * @property string|null $metodo_http     GET, POST, PUT, PATCH, DELETE…
 * @property string|null $endpoint
 * @property int|null    $status_code
 * @property int|null    $tiempo_respuesta Tiempo en milisegundos.
 * @property array|null  $contexto        IP, user-agent, referrer, URL completa.
 * @property string|null $request_payload
 * @property string|null $response_payload
 * @property int|null    $user_id
 * @property \Carbon\Carbon $created_at
 */
class LogSistema extends Model
{
    protected $table = 'logs';

    protected $primaryKey = 'id_log';

    public $timestamps = false;

    protected $fillable = [
        'tipo',
        'mensaje',
        'metodo_http',
        'endpoint',
        'status_code',
        'tiempo_respuesta',
        'contexto',
        'request_payload',
        'response_payload',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'contexto' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Usuario que generó la actividad registrada, si está autenticado.
     *
     * @return BelongsTo<User, self>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id_user');
    }

    /**
     * Accesor que clasifica el `status_code` HTTP en una categoría semántica.
     *
     * @return string 'success' (2xx) | 'info' (3xx o sin código) | 'warning' (4xx) | 'error' (5xx)
     */
    public function getStatusClaseAttribute(): string
    {
        if (! $this->status_code) {
            return 'info';
        }

        if ($this->status_code >= 200 && $this->status_code < 300) {
            return 'success';
        }

        if ($this->status_code >= 300 && $this->status_code < 400) {
            return 'info';
        }

        if ($this->status_code >= 400 && $this->status_code < 500) {
            return 'warning';
        }

        return 'error';
    }

    /**
     * Obtiene un valor del campo JSON `contexto` de forma segura.
     *
     * @param  string $key     Clave a leer (ej. 'ip', 'user_agent').
     * @param  mixed  $default Valor por defecto si la clave no existe.
     * @return mixed
     */
    public function getContexto(string $key, mixed $default = null): mixed
    {
        return $this->contexto[$key] ?? $default;
    }
}
