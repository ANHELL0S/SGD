<?php

namespace App\Models;

use App\Concerns\AuditsCrudActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Representa un área organizacional dentro del sistema.
 *
 * Las áreas agrupan usuarios, documentos y expedientes. Soporta soft delete;
 * solo puede eliminarse si no tiene dependencias activas.
 * Registra auditoría de cambios mediante {@see AuditsCrudActivity}.
 *
 * @property int    $id_area
 * @property string $nombre
 */
class Area extends Model
{
    use AuditsCrudActivity, SoftDeletes;

    protected $table = 'areas';

    protected $primaryKey = 'id_area';

    protected $fillable = ['nombre'];

    /**
     * Documentos cuya área actual es esta área.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Documento>
     */
    public function documentos()
    {
        return $this->hasMany(Documento::class, 'area_actual_id', 'id_area');
    }

    /**
     * Usuarios que pertenecen a esta área.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<User>
     */
    public function usuarios()
    {
        return $this->hasMany(User::class, 'area_id', 'id_area');
    }

    /**
     * Movimientos en los que esta área es el origen del envío.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Movimiento>
     */
    public function movimientosSalida()
    {
        return $this->hasMany(Movimiento::class, 'de_area_id', 'id_area');
    }

    /**
     * Movimientos en los que esta área es el destino del envío.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Movimiento>
     */
    public function movimientosEntrada()
    {
        return $this->hasMany(Movimiento::class, 'a_area_id', 'id_area');
    }

    /**
     * Expedientes creados por esta área.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Expediente>
     */
    public function expedientes()
    {
        return $this->hasMany(Expediente::class, 'area_creadora_id', 'id_area');
    }
}
