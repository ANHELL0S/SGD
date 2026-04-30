<?php

namespace App\Models;

use App\Concerns\AuditsCrudActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class Remitente extends Model
{
    use AuditsCrudActivity, Notifiable, SoftDeletes;

    protected $table = 'remitentes';

    protected $primaryKey = 'id_remitente';

    protected $fillable = ['nombre', 'email', 'estado'];

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

    public function routeNotificationForMail(): ?string
    {
        return $this->email;
    }
}
