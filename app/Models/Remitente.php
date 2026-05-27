<?php

namespace App\Models;

use App\Concerns\AuditsCrudActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

/**
 * Representa una entidad externa que envía documentos al sistema.
 *
 * Soporta soft delete y notificaciones por correo. El campo `estado` (booleano)
 * indica si el remitente está activo y disponible para seleccionar en formularios.
 * Registra auditoría mediante {@see AuditsCrudActivity}.
 *
 * @property int    $id_remitente
 * @property string $nombre
 * @property string|null $email
 * @property bool   $estado Activo (true) / Inactivo (false).
 */
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

    /**
     * Documentos asociados a este remitente.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Documento>
     */
    public function documentos()
    {
        return $this->hasMany(Documento::class, 'remitente_id', 'id_remitente');
    }

    /**
     * Canal de correo para notificaciones: usa el email del remitente.
     *
     * @return string|null
     */
    public function routeNotificationForMail(): ?string
    {
        return $this->email;
    }
}
