<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Validation\Rule;

/**
 * Reglas de validación compartidas para nombre y correo electrónico del perfil de usuario.
 *
 * El parámetro `$userId` en `emailRules` activa `Rule::unique()->ignore()` para permitir
 * que un usuario actualice su propio perfil sin conflicto de unicidad con su email actual.
 */
trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @param  int|null $userId ID del usuario a ignorar en la validación de unicidad de email;
     *                          null al crear un usuario nuevo.
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
