<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Valida la creación y actualización de un remitente.
 *
 * Normaliza el nombre a mayúsculas y convierte el campo `estado` a booleano
 * antes de validar, para aceptar valores provenientes de checkboxes HTML.
 */
class StoreRemitenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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

    public function rules(): array
    {
        $remitenteId = $this->route('remitente')?->id_remitente;

        return [
            'nombre' => [
                'required', 'string', 'max:50', 'regex:/^[\pL\pN\s]+$/u',
                Rule::unique('remitentes', 'nombre')
                    ->whereNull('deleted_at')
                    ->ignore($remitenteId, 'id_remitente'),
            ],
            'email'  => ['nullable', 'email', 'max:255'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.unique' => 'Ya existe un remitente activo con este nombre.',
        ];
    }
}
