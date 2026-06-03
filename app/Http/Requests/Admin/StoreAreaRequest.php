<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Valida la creación y actualización de un área.
 *
 * Normaliza el nombre a mayúsculas, sin espacios extra, antes de validar.
 * Solo acepta letras y espacios (sin números ni caracteres especiales).
 */
class StoreAreaRequest extends FormRequest
{
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
                ->upper()
                ->toString(),
        ]);
    }

    public function rules(): array
    {
        $areaId = $this->route('area')?->id_area;

        return [
            'nombre' => [
                'required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u',
                Rule::unique('areas', 'nombre')
                    ->whereNull('deleted_at')
                    ->ignore($areaId, 'id_area'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.unique' => 'Ya existe un área activa con este nombre.',
        ];
    }
}
