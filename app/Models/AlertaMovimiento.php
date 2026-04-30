<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id_user');
    }

    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(Movimiento::class, 'movimiento_id', 'id_movimiento');
    }

    public function scopeNoLeidas($query)
    {
        return $query->whereNull('leido_at');
    }
}
