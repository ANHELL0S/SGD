<?php

namespace App\Models;

use App\Concerns\AuditsCrudActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Area extends Model
{
    use AuditsCrudActivity, SoftDeletes;

    protected $table = 'areas';

    protected $primaryKey = 'id_area';

    protected $fillable = ['nombre'];

    public function documentos()
    {
        return $this->hasMany(Documento::class, 'area_actual_id', 'id_area');
    }

    public function usuarios()
    {
        return $this->hasMany(User::class, 'area_id', 'id_area');
    }

    public function movimientosSalida()
    {
        return $this->hasMany(Movimiento::class, 'de_area_id', 'id_area');
    }

    public function movimientosEntrada()
    {
        return $this->hasMany(Movimiento::class, 'a_area_id', 'id_area');
    }

    public function expedientes()
    {
        return $this->hasMany(Expediente::class, 'area_creadora_id', 'id_area');
    }
}
