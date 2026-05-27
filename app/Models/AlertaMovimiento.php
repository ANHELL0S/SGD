<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa una alerta de movimiento pendiente de respuesta para un usuario.
 *
 * Se crea cuando el consultor envía un recordatorio o cuando el sistema detecta
 * un movimiento sin respuesta. El campo `leido_at` marca cuándo el usuario la vio.
 *
 * @property int         $id
 * @property int         $user_id
 * @property int         $movimiento_id
 * @property string      $nivel        Nivel de urgencia: 'recordatorio', 'media', 'alta', 'bloqueado'.
 * @property string      $asunto
 * @property \Carbon\Carbon|null $leido_at
 */
class AlertaMovimiento extends Model
{
    protected $table = 'alertas_movimiento';

    protected $fillable = [
        'user_id',
        'movimiento_id',
        'nivel',
        'asunto',
        'leido_at',
    ];

    protected $casts = [
        'leido_at' => 'datetime',
    ];

    /**
     * Usuario propietario de la alerta.
     *
     * @return BelongsTo<User, self>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id_user');
    }

    /**
     * Movimiento al que hace referencia la alerta.
     *
     * @return BelongsTo<Movimiento, self>
     */
    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(Movimiento::class, 'movimiento_id', 'id_movimiento');
    }

    /**
     * Filtra solo las alertas que el usuario aún no ha leído.
     *
     * @param  \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeNoLeidas($query)
    {
        return $query->whereNull('leido_at');
    }
}
