<?php

namespace App\Models;

use App\Concerns\AuditsCrudActivity;
use App\Observers\DocumentoObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;

/**
 * Representa un oficio (documento) dentro del sistema de gestión documental.
 *
 * Soporta soft delete, auditoría ({@see AuditsCrudActivity}) y es observado por
 * {@see DocumentoObserver}. Al crearse, si `hilo_id` es null se auto-asigna
 * su propio ID para iniciar un hilo de conversación.
 *
 * Los documentos de respuesta se vinculan al original mediante `documento_padre_id`
 * y al hilo raíz mediante `hilo_id`. El campo `movimiento_origen_id` referencia
 * el movimiento que originó la respuesta.
 *
 * @property int         $id_documento
 * @property string|null $numero_oficio
 * @property string      $asunto
 * @property \Carbon\Carbon $fecha_oficio
 * @property int         $remitente_id
 * @property string      $tipo            'interno' | 'externo'
 * @property string      $palabra_clave
 * @property string      $archivo         Path relativo en disco público.
 * @property string|null $contenido_ocr   Texto extraído por OCR.
 * @property string      $recibido        'subido' | 'enviado' | 'recibido'
 * @property int         $area_actual_id
 * @property int         $area_creadora_id
 * @property int         $user_id
 * @property int|null    $documento_padre_id
 * @property int|null    $movimiento_origen_id
 * @property int|null    $hilo_id
 * @property int|null    $expediente_id
 * @property \Carbon\Carbon|null $conversacion_cerrada_at
 */
#[ObservedBy(DocumentoObserver::class)]
class Documento extends Model
{
    use AuditsCrudActivity, HasFactory, SoftDeletes;

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

    /**
     * Auto-asigna `hilo_id` al propio ID del documento si no fue definido al crearlo.
     * Esto convierte al documento en la raíz de su propio hilo de conversación.
     *
     * @return void
     */
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

    /**
     * Área donde se encuentra el documento actualmente.
     *
     * @return BelongsTo<Area, self>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_actual_id', 'id_area');
    }

    /**
     * Área que creó el documento originalmente.
     *
     * @return BelongsTo<Area, self>
     */
    public function areaCreadora(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_creadora_id', 'id_area');
    }

    /**
     * Remitente externo que originó el documento.
     *
     * @return BelongsTo<Remitente, self>
     */
    public function remitente(): BelongsTo
    {
        return $this->belongsTo(Remitente::class, 'remitente_id', 'id_remitente');
    }

    /**
     * Movimientos de traslado asociados a este documento.
     *
     * @return HasMany<Movimiento>
     */
    public function movimientos(): HasMany
    {
        return $this->hasMany(Movimiento::class, 'documento_id', 'id_documento');
    }

    /**
     * Documentos de respuesta generados a partir de este documento.
     *
     * @return HasMany<self>
     */
    public function documentosHijos(): HasMany
    {
        return $this->hasMany(self::class, 'documento_padre_id', 'id_documento');
    }

    /**
     * Usuario que subió el documento al sistema.
     *
     * @return BelongsTo<User, self>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id_user');
    }

    /**
     * Documento del que este es respuesta directa.
     *
     * @return BelongsTo<self, self>
     */
    public function documentoPadre(): BelongsTo
    {
        return $this->belongsTo(self::class, 'documento_padre_id', 'id_documento');
    }

    /**
     * Documento raíz del hilo de conversación al que pertenece este documento.
     *
     * @return BelongsTo<self, self>
     */
    public function documentoHilo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'hilo_id', 'id_documento');
    }

    /**
     * Movimiento que originó la creación de este documento como respuesta.
     *
     * @return BelongsTo<Movimiento, self>
     */
    public function movimientoOrigen(): BelongsTo
    {
        return $this->belongsTo(Movimiento::class, 'movimiento_origen_id', 'id_movimiento');
    }

    /**
     * Expediente al que pertenece este documento.
     *
     * @return BelongsTo<Expediente, self>
     */
    public function expediente(): BelongsTo
    {
        return $this->belongsTo(Expediente::class, 'expediente_id', 'id_expediente');
    }

    /**
     * Usuario que cerró la conversación de este hilo.
     *
     * @return BelongsTo<User, self>
     */
    public function conversacionCerradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conversacion_cerrada_por_user_id', 'id_user');
    }
}
