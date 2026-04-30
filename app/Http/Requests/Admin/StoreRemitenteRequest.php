<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class StoreRemitenteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
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
        return [
            'nombre' => ['required', 'string', 'max:100', 'regex:/^[\pL\pN\s]+$/u'],
            'email' => ['nullable', 'email', 'max:255'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
