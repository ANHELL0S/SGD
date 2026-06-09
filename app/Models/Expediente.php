<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Agrupa documentos y movimientos relacionados bajo un mismo hilo de gestión.
 *
 * Se crea automáticamente al enviar el primer movimiento de un documento sin expediente.
 * El código sigue el formato `EXP-YYYYMM-NNNN`. El estado puede ser `abierto` o `cerrado`;
 * cuando está cerrado no se permiten nuevos movimientos ni respuestas.
 *
 * @property int    $id_expediente
 * @property string $codigo_expediente
 * @property string|null $asunto_resumen
 * @property string $estado    'abierto' | 'cerrado'
 * @property string $prioridad 'baja' | 'media' | 'alta'
 * @property \Carbon\Carbon $fecha_inicio
 * @property int    $area_creadora_id
 */
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
        'motivo_cierre',
        'cerrado_por_user_id',
        'cerrado_at',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'cerrado_at'   => 'datetime',
        ];
    }

    /**
     * Área que creó el expediente.
     *
     * @return BelongsTo<Area, self>
     */
    public function areaCreadora(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_creadora_id', 'id_area');
    }

    /**
     * Usuario que cerró el expediente.
     *
     * @return BelongsTo<User, self>
     */
    public function cerradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cerrado_por_user_id', 'id_user');
    }

    /**
     * Documentos asociados al expediente.
     *
     * @return HasMany<Documento>
     */
    public function documentos(): HasMany
    {
        return $this->hasMany(Documento::class, 'expediente_id', 'id_expediente');
    }

    /**
     * Movimientos realizados dentro del expediente.
     *
     * @return HasMany<Movimiento>
     */
    public function movimientos(): HasMany
    {
        return $this->hasMany(Movimiento::class, 'expediente_id', 'id_expediente');
    }
}
