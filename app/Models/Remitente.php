<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Remitente extends Model
{
    protected $table = 'remitentes';
    protected $primaryKey = 'id_remitente';
    protected $fillable = ['nombre', 'estado'];

    protected function casts(): array
    {
        return [
            'estado' => 'boolean',
        ];
    }

    public function documentos()
    {
        return $this->hasMany(Documento::class, 'remitente_id', 'id_remitente');
    }

}
