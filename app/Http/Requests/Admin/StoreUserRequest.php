<?php

namespace App\Http\Requests\Admin;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    use PasswordValidationRules;

    public function authorize(): bool
    {
        return true;
    }

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
