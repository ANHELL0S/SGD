<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Documento extends Model
{
    use SoftDeletes;

    protected $table = 'documentos';
    protected $primaryKey = 'id_documento';
    protected $fillable = [
        'numero_oficio',
        'fecha_oficio',
        'remitente_id',
        'tipo',
        'palabra_clave',
        'archivo',
        'contenido_ocr',
        'area_actual_id',
        'user_id',
        'recibido',
        'documento_padre_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha_oficio' => 'date',
        ];
    }

    public function area()
    {
        return $this->belongsTo(Area::class, 'area_actual_id', 'id_area');
    }

    public function remitente()
    {
        return $this->belongsTo(Remitente::class, 'remitente_id', 'id_remitente');
    }

    public function movimientos()
    {
        return $this->hasMany(Movimiento::class, 'documento_id', 'id_documento');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id_user');
    }

    public function documentoPadre()
    {
        return $this->belongsTo(self::class, 'documento_padre_id', 'id_documento');
    }
}
