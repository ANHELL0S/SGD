<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id_user');
    }

    // Accesor para obtener la clasificación de status
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

    // Obtener un valor seguro del contexto
    public function getContexto(string $key, mixed $default = null): mixed
    {
        return $this->contexto[$key] ?? $default;
    }
}
