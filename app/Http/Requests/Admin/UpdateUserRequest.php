<?php

namespace App\Http\Requests\Admin;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Valida la actualización de un usuario existente por el administrador.
 *
 * Idéntica a {@see StoreUserRequest} salvo que:
 * - La unicidad de cédula y email excluye al propio usuario (`ignore`).
 * - La contraseña es opcional: si se envía vacía se normaliza a `null` y no se valida.
 */
class UpdateUserRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Cualquier usuario autenticado puede realizar esta acción;
     * la restricción de rol se aplica en el middleware de la ruta.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normaliza los campos de texto y convierte contraseña vacía a `null`
     * para que la regla `nullable` la omita correctamente.
     *
     * @return void
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => Str::of((string) $this->input('nombre'))
                ->trim()
                ->squish()
                ->toString(),
            'apellido' => Str::of((string) $this->input('apellido'))
                ->trim()
                ->squish()
                ->toString(),
            'cedula' => Str::of((string) $this->input('cedula'))
                ->trim()
                ->toString(),
            'email' => Str::of((string) $this->input('email'))
                ->trim()
                ->lower()
                ->toString(),
            'rol' => Str::of((string) $this->input('rol'))
                ->trim()
                ->lower()
                ->toString(),
            'password' => blank($this->input('password'))
                ? null
                : $this->input('password'),
            'password_confirmation' => blank($this->input('password_confirmation'))
                ? null
                : $this->input('password_confirmation'),
        ]);
    }

    /**
     * Reglas de validación para la actualización del usuario.
     *
     * Igual que en creación, pero la unicidad de `cedula` y `email` ignora
     * el registro actual del usuario para permitir guardar sin cambiarlos.
     * La contraseña es `nullable`: si viene vacía, no se valida ni se actualiza.
     *
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->route('user');

        return [
            'nombre' => ['required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u'],
            'apellido' => ['required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u'],
            'cedula' => ['required', 'string', 'size:10', 'regex:/^[0-9]+$/', Rule::unique(User::class, 'cedula')->ignore($user->getKey(), $user->getKeyName())],
            'email' => ['required', 'string', 'email', 'max:75', Rule::unique(User::class, 'email')->ignore($user->getKey(), $user->getKeyName())],
            'area_id' => ['nullable', 'integer', Rule::exists('areas', 'id_area')],
            'rol' => ['required', Rule::in(['user', 'admin', 'consultor'])],
            'password' => ['nullable', 'string', 'max:100', Password::min(8)->letters()->mixedCase()->numbers(), 'regex:/[.@#]/', 'confirmed'],
        ];
    }

    /**
     * Mensajes de error personalizados para las reglas más restrictivas.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre.regex' => 'El nombre solo puede contener letras y espacios.',
            'apellido.regex' => 'El apellido solo puede contener letras y espacios.',
            'cedula.size' => 'La cédula debe tener exactamente 10 dígitos.',
            'cedula.regex' => 'La cédula solo puede contener números.',
            'password.regex' => 'La contraseña debe incluir al menos uno de estos caracteres especiales: . @ #',
        ];
    }
}
