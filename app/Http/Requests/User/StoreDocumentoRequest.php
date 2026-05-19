<?php

namespace App\Http\Requests\User;

use App\Models\Documento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|string>|string>
     */
    public function rules(): array
    {
        return [
            'numero_oficio' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique(Documento::class, 'numero_oficio')->withoutTrashed(),
            ],
            'asunto' => ['required', 'string', 'max:255'],
            'fecha_oficio' => ['required', 'date'],
            'remitente_id' => ['required', 'integer', Rule::exists('remitentes', 'id_remitente')],
            'tipo' => ['required', Rule::in(['interno', 'externo'])],
            'palabra_clave' => ['required', 'string', 'max:30'],
            'archivo' => ['required', 'file', 'mimes:pdf', 'max:2048'],
        ];
    }
}
