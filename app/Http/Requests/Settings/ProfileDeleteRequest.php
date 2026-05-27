<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Valida la eliminación de la cuenta del usuario autenticado.
 *
 * Exige la contraseña actual como confirmación antes de proceder con el borrado,
 * usando {@see PasswordValidationRules::currentPasswordRules()}.
 */
class ProfileDeleteRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Reglas de validación para la eliminación de cuenta.
     *
     * - `password`: obligatoria, debe coincidir con la contraseña actual del usuario.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => $this->currentPasswordRules(),
        ];
    }
}
