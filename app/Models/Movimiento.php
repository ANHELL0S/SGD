<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Movimiento extends Model
{
    protected $table = 'movimientos';
    protected $primaryKey = 'id_movimiento';
    protected $fillable = [
        'documento_id',
        'de_area_id',
        'a_area_id',
        'enviado_por',
        'comentario',
        'fecha_recepcion',
        'fecha_envio'
    ];

    public function documento()
    {
        return $this->belongsTo(Documento::class, 'documento_id', 'id_documento');
    }

    public function deArea()
    {
        return $this->belongsTo(Area::class, 'de_area_id', 'id_area');
    }

    public function aArea()
    {
        return $this->belongsTo(Area::class, 'a_area_id', 'id_area');
    }

    public function remitente()
    {
        return $this->belongsTo(User::class, 'enviado_por', 'id_user');
    }
}
