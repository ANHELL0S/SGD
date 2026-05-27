<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

/**
 * Valida la creación y actualización de un área.
 *
 * Normaliza el nombre a mayúsculas, sin espacios extra, antes de validar.
 * Solo acepta letras y espacios (sin números ni caracteres especiales).
 */
class StoreAreaRequest extends FormRequest
{
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
     * Normaliza `nombre`: elimina espacios extremos, colapsa espacios internos
     * y convierte a mayúsculas antes de ejecutar la validación.
     *
     * @return void
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => Str::of((string) $this->input('nombre'))
                ->trim()
                ->squish()
                ->upper()
                ->toString(),
        ]);
    }

    /**
     * Reglas de validación del área.
     *
     * - `nombre`: obligatorio, solo letras Unicode y espacios, máximo 50 caracteres.
     *
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u'],
        ];
    }
}
