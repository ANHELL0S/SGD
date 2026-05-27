<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

/**
 * Valida la creación y actualización de un remitente.
 *
 * Normaliza el nombre a mayúsculas y convierte el campo `estado` a booleano
 * antes de validar, para aceptar valores provenientes de checkboxes HTML.
 */
class StoreRemitenteRequest extends FormRequest
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
     * Normaliza `nombre` a mayúsculas sin espacios extra y convierte `estado`
     * de string ('1', 'true', 'on') a booleano si el campo está presente.
     *
     * @return void
     */
    protected function prepareForValidation(): void
    {
        $payload = [
            'nombre' => Str::of((string) $this->input('nombre'))
                ->trim()
                ->squish()
                ->upper()
                ->toString(),
        ];

        if ($this->has('estado')) {
            $payload['estado'] = in_array((string) $this->input('estado'), ['1', 'true', 'on'], true);
        }

        $this->merge($payload);
    }

    /**
     * Reglas de validación del remitente.
     *
     * - `nombre`: obligatorio, letras Unicode, números y espacios, máximo 50 caracteres.
     * - `email`:  opcional, formato email válido, máximo 255 caracteres.
     * - `estado`: opcional, booleano (normalizado en `prepareForValidation`).
     *
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:50', 'regex:/^[\pL\pN\s]+$/u'],
            'email' => ['nullable', 'email', 'max:255'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
