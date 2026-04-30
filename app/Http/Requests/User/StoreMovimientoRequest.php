<?php

namespace App\Http\Requests\User;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMovimientoRequest extends FormRequest
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
            'id_documento' => [
                'required',
                'integer',
                Rule::exists('documentos', 'id_documento')->whereNull('deleted_at'),
            ],
            'a_area_id' => ['required', 'integer', Rule::exists('areas', 'id_area')],
            'destinatario_user_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id_user')
                    ->where(fn ($query) => $query
                        ->where('estado', 'aprobado')
                        ->where('habilitado', true)
                        ->where('area_id', $this->integer('a_area_id'))),
            ],
            'comentario' => ['required', 'string', 'max:2000'],
        ];
    }
}
