<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'nombre' => ['required', 'string', 'max:100', 'regex:/^[\pL\s]+$/u'],
            'apellido' => ['required', 'string', 'max:100', 'regex:/^[\pL\s]+$/u'],
            'cedula' => ['required', 'string', 'size:10', 'regex:/^[0-9]+$/', Rule::unique(User::class, 'cedula')],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class, 'email')],
            'area_id' => ['required', 'integer', Rule::exists('areas', 'id_area')],
            'password' => $this->passwordRules(),
        ], [
            'nombre.regex' => 'El nombre solo puede contener letras y espacios.',
            'apellido.regex' => 'El apellido solo puede contener letras y espacios.',
            'cedula.size' => 'La cédula debe tener exactamente 10 dígitos.',
            'cedula.regex' => 'La cédula solo puede contener números.',
            'password.regex' => 'La contraseña debe incluir al menos uno de estos caracteres especiales: . @ #',
        ])->validate();

        return User::create([
            'nombre' => $input['nombre'],
            'apellido' => $input['apellido'],
            'cedula' => $input['cedula'],
            'email' => $input['email'],
            'password' => $input['password'],
            'rol' => 'user',
            'estado' => 'pendiente',
            'area_id' => (int) $input['area_id'],
        ]);
    }
}
