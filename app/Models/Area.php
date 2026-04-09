<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
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
    
}
