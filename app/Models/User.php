<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Concerns\AuditsCrudActivity;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * Usuario del sistema con soporte de autenticación y 2FA (Fortify).
 *
 * Los roles disponibles son: `user`, `admin` y `consultor`.
 * `estado` controla si el registro fue aprobado por el admin ('pendiente' | 'aprobado' | 'rechazado').
 * `habilitado` permite deshabilitar temporalmente una cuenta aprobada.
 * La contraseña se hashea automáticamente mediante el cast `hashed`.
 * Registra auditoría mediante {@see AuditsCrudActivity}.
 *
 * @property int    $id_user
 * @property string $nombre
 * @property string $apellido
 * @property string $cedula
 * @property string $email
 * @property string $rol        'user' | 'admin' | 'consultor'
 * @property string $estado     'pendiente' | 'aprobado' | 'rechazado'
 * @property bool   $habilitado
 * @property int|null $area_id
 */
#[Fillable(['nombre', 'apellido', 'cedula', 'email', 'password', 'rol', 'estado', 'habilitado', 'area_id'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use AuditsCrudActivity, HasFactory, Notifiable, TwoFactorAuthenticatable;

    protected $primaryKey = 'id_user';

    protected $fillable = [
        'nombre',
        'apellido',
        'cedula',
        'email',
        'password',
        'rol',
        'estado',
        'habilitado',
        'area_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'habilitado' => 'boolean',
        ];
    }

    /**
     * Área organizacional a la que pertenece el usuario.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<Area, self>
     */
    public function area()
    {
        return $this->belongsTo(Area::class, 'area_id', 'id_area');
    }
}
