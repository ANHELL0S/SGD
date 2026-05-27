<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Laravel\Fortify\InteractsWithTwoFactorState;

/**
 * Request especializado para las acciones de autenticación de dos factores (2FA).
 *
 * Usa el trait {@see InteractsWithTwoFactorState} de Fortify, que expone
 * `ensureStateIsValid()` para verificar el estado del 2FA en el controlador.
 * La validación de inputs no es necesaria aquí; la gestiona Fortify internamente.
 */
class TwoFactorAuthenticationRequest extends FormRequest
{
    use InteractsWithTwoFactorState;

    /**
     * No requiere reglas de validación de inputs; la verificación del estado
     * 2FA se delega a `ensureStateIsValid()` del trait de Fortify.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [];
    }
}
