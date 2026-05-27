<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Valida la actualización de los datos de perfil del usuario autenticado.
 *
 * Delega las reglas al concern {@see ProfileValidationRules}, pasando el ID del
 * usuario para que la unicidad del email excluya el registro propio.
 */
class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Reglas de validación del perfil, con unicidad de email ignorando al usuario actual.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->profileRules($this->user()->id);
    }
}
