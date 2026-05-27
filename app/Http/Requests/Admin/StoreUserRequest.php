<?php

namespace App\Http\Requests\Admin;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Valida la creación de un usuario por el administrador.
 *
 * Normaliza nombre, apellido, cédula, email y rol antes de validar.
 * Las reglas de contraseña se obtienen del concern {@see PasswordValidationRules}.
 * La unicidad de cédula y email se verifica contra la tabla `users`.
 */
class StoreUserRequest extends FormRequest
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
     * Normaliza los campos de texto antes de validar:
     * nombre y apellido con trim+squish, email a minúsculas, rol a minúsculas.
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
        ]);
    }

    /**
     * Reglas de validación del nuevo usuario.
     *
     * - `nombre` / `apellido`: solo letras Unicode y espacios, máx. 50.
     * - `cedula`:  exactamente 10 dígitos, único en `users`.
     * - `email`:   formato válido, único en `users`.
     * - `area_id`: opcional, debe existir en `areas`.
     * - `rol`:     uno de: user, admin, consultor.
     * - `password`: según {@see PasswordValidationRules::passwordRules()}.
     *
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u'],
            'apellido' => ['required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u'],
            'cedula' => ['required', 'string', 'size:10', 'regex:/^[0-9]+$/', Rule::unique(User::class, 'cedula')],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class, 'email')],
            'area_id' => ['nullable', 'integer', Rule::exists('areas', 'id_area')],
            'rol' => ['required', Rule::in(['user', 'admin', 'consultor'])],
            'password' => $this->passwordRules(),
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
