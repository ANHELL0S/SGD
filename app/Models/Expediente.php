<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Expediente extends Model
{
    protected $table = 'expedientes';

    protected $primaryKey = 'id_expediente';

    protected $fillable = [
        'codigo_expediente',
        'asunto_resumen',
        'estado',
        'fecha_inicio',
        'prioridad',
        'area_creadora_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
        ];
    }

    public function areaCreadora(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_creadora_id', 'id_area');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(Documento::class, 'expediente_id', 'id_expediente');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(Movimiento::class, 'expediente_id', 'id_expediente');
    }
}
