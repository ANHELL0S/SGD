<?php

namespace App\Models;

use App\Concerns\AuditsCrudActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;

class Documento extends Model
{
    use AuditsCrudActivity, SoftDeletes;

    protected $table = 'documentos';

    protected $primaryKey = 'id_documento';

    protected $fillable = [
        'numero_oficio',
        'asunto',
        'fecha_oficio',
        'remitente_id',
        'tipo',
        'palabra_clave',
        'archivo',
        'contenido_ocr',
        'area_actual_id',
        'area_creadora_id',
        'user_id',
        'recibido',
        'documento_padre_id',
        'movimiento_origen_id',
        'hilo_id',
        'expediente_id',
        'conversacion_cerrada_at',
        'conversacion_cerrada_por_user_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha_oficio' => 'date',
            'conversacion_cerrada_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (self $documento): void {
            if (! Schema::hasColumn($documento->getTable(), 'hilo_id')) {
                return;
            }

            if ($documento->hilo_id === null) {
                $documento->forceFill([
                    'hilo_id' => $documento->id_documento,
                ])->saveQuietly();
            }
        });
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_actual_id', 'id_area');
    }

    public function areaCreadora(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_creadora_id', 'id_area');
    }

    public function remitente(): BelongsTo
    {
        return $this->belongsTo(Remitente::class, 'remitente_id', 'id_remitente');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(Movimiento::class, 'documento_id', 'id_documento');
    }

    public function documentosHijos(): HasMany
    {
        return $this->hasMany(self::class, 'documento_padre_id', 'id_documento');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id_user');
    }

    public function documentoPadre(): BelongsTo
    {
        return $this->belongsTo(self::class, 'documento_padre_id', 'id_documento');
    }

    public function documentoHilo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'hilo_id', 'id_documento');
    }

    public function movimientoOrigen(): BelongsTo
    {
        return $this->belongsTo(Movimiento::class, 'movimiento_origen_id', 'id_movimiento');
    }

    public function expediente(): BelongsTo
    {
        return $this->belongsTo(Expediente::class, 'expediente_id', 'id_expediente');
    }

    public function conversacionCerradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conversacion_cerrada_por_user_id', 'id_user');
    }
}
