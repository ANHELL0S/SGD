<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Valida el cambio de contraseña del usuario autenticado.
 *
 * Requiere la contraseña actual (verificada contra el hash en BD) y la nueva
 * contraseña con sus reglas de complejidad definidas en {@see PasswordValidationRules}.
 */
class PasswordUpdateRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Reglas de validación para el cambio de contraseña.
     *
     * - `current_password`: obligatoria, debe coincidir con la contraseña actual del usuario.
     * - `password`:         nueva contraseña según {@see PasswordValidationRules::passwordRules()}.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => $this->currentPasswordRules(),
            'password' => $this->passwordRules(),
        ];
    }
}
