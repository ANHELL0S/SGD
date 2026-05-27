<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Centraliza las reglas de validación de contraseñas para mantenerlas consistentes
 * en formularios de creación de usuario, cambio de contraseña y configuración de perfil.
 *
 * Requisitos: mínimo 8 caracteres, letras mayúsculas y minúsculas, al menos un número
 * y al menos un carácter especial del conjunto `[.@#]`.
 */
trait PasswordValidationRules
{
    /**
     * Get the validation rules used to validate passwords.
     *
     * @return array<int, Rule|array<mixed>|string>
     */
    protected function passwordRules(): array
    {
        return [
            'required',
            'string',
            'max:100',
            Password::min(8)->letters()->mixedCase()->numbers(),
            'regex:/[.@#]/',
            'confirmed',
        ];
    }

    /**
     * Get the validation rules used to validate the current password.
     *
     * @return array<int, Rule|array<mixed>|string>
     */
    protected function currentPasswordRules(): array
    {
        return ['required', 'string', 'current_password'];
    }
}
