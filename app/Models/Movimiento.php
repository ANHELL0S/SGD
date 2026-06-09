<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa el traslado de un documento entre dos áreas.
 *
 * Un movimiento queda pendiente hasta que el área destino registra `fecha_recepcion`.
 * Si `destinatario_user_id` es null, el movimiento va dirigido a toda el área.
 * El campo `respuesta_comentario` se usa cuando la respuesta es solo texto (sin nuevo documento).
 * `ultimo_recordatorio_at` controla el cooldown de 3 horas entre recordatorios.
 *
 * @property int         $id_movimiento
 * @property int         $documento_id
 * @property int|null    $expediente_id
 * @property int         $de_area_id
 * @property int         $a_area_id
 * @property int|null    $destinatario_user_id
 * @property int         $enviado_por
 * @property string|null $comentario
 * @property string|null $respuesta_comentario
 * @property \Carbon\Carbon      $fecha_envio
 * @property \Carbon\Carbon|null $fecha_recepcion
 * @property \Carbon\Carbon|null $ultimo_recordatorio_at
 */
class Movimiento extends Model
{
    protected $table = 'movimientos';

    protected $primaryKey = 'id_movimiento';

    protected $fillable = [
        'documento_id',
        'expediente_id',
        'de_area_id',
        'a_area_id',
        'es_copia',
        'movimiento_original_id',
        'destinatario_user_id',
        'enviado_por',
        'comentario',
        'respuesta_comentario',
        'es_respuesta_comentario',
        'fecha_recepcion',
        'fecha_envio',
        'ultimo_recordatorio_at',
    ];

    protected $casts = [
        'es_copia'                => 'boolean',
        'es_respuesta_comentario' => 'boolean',
        'fecha_envio'             => 'datetime',
        'fecha_recepcion'         => 'datetime',
        'ultimo_recordatorio_at'  => 'datetime',
    ];

    /**
     * Documento que se está moviendo.
     *
     * @return BelongsTo<Documento, self>
     */
    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id', 'id_documento');
    }

    /**
     * Área de origen del movimiento.
     *
     * @return BelongsTo<Area, self>
     */
    public function deArea(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'de_area_id', 'id_area');
    }

    /**
     * Área de destino del movimiento.
     *
     * @return BelongsTo<Area, self>
     */
    public function aArea(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'a_area_id', 'id_area');
    }

    /**
     * Usuario que envió el movimiento (`enviado_por`).
     *
     * @return BelongsTo<User, self>
     */
    public function remitente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enviado_por', 'id_user');
    }

    /**
     * Usuario específico al que va dirigido el movimiento, o null si es para toda el área.
     *
     * @return BelongsTo<User, self>
     */
    public function destinatario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'destinatario_user_id', 'id_user');
    }

    /**
     * Expediente al que pertenece este movimiento.
     *
     * @return BelongsTo<Expediente, self>
     */
    public function expediente(): BelongsTo
    {
        return $this->belongsTo(Expediente::class, 'expediente_id', 'id_expediente');
    }

    /**
     * Documentos de respuesta generados a partir de este movimiento.
     *
     * @return HasMany<Documento>
     */
    public function documentosGenerados(): HasMany
    {
        return $this->hasMany(Documento::class, 'movimiento_origen_id', 'id_movimiento');
    }

    /**
     * Movimiento original al que esta copia está vinculada (solo si es_copia = true).
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<self, self>
     */
    public function movimientoOriginal(): BelongsTo
    {
        return $this->belongsTo(self::class, 'movimiento_original_id', 'id_movimiento');
    }

    /**
     * Copias enviadas junto a este movimiento original.
     *
     * @return HasMany<self>
     */
    public function copias(): HasMany
    {
        return $this->hasMany(self::class, 'movimiento_original_id', 'id_movimiento');
    }
}
