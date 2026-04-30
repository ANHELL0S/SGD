<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Movimiento extends Model
{
    protected $table = 'movimientos';

    protected $primaryKey = 'id_movimiento';

    protected $fillable = [
        'documento_id',
        'expediente_id',
        'de_area_id',
        'a_area_id',
        'destinatario_user_id',
        'enviado_por',
        'comentario',
        'fecha_recepcion',
        'fecha_envio',
        'ultimo_recordatorio_at',
    ];

    protected $casts = [
        'fecha_envio'             => 'datetime',
        'fecha_recepcion'         => 'datetime',
        'ultimo_recordatorio_at'  => 'datetime',
    ];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id', 'id_documento');
    }

    public function deArea(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'de_area_id', 'id_area');
    }

    public function aArea(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'a_area_id', 'id_area');
    }

    public function remitente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enviado_por', 'id_user');
    }

    public function destinatario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'destinatario_user_id', 'id_user');
    }

    public function expediente(): BelongsTo
    {
        return $this->belongsTo(Expediente::class, 'expediente_id', 'id_expediente');
    }

    public function documentosGenerados(): HasMany
    {
        return $this->hasMany(Documento::class, 'movimiento_origen_id', 'id_movimiento');
    }
}
