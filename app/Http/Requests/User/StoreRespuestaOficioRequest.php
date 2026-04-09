<?php

namespace App\Http\Requests\User;

use App\Models\Documento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRespuestaOficioRequest extends FormRequest
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
     * @return array<string, array<int, \Illuminate\Contracts\Validation\ValidationRule|string>|string>
     */
    public function rules(): array
    {
        return [
            'movimiento_id' => ['required', 'integer', Rule::exists('movimientos', 'id_movimiento')],
            'numero_oficio' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique(Documento::class, 'numero_oficio')->withoutTrashed(),
            ],
            'fecha_oficio' => ['required', 'date'],
            'remitente_id' => ['required', 'integer', Rule::exists('remitentes', 'id_remitente')],
            'tipo' => ['required', Rule::in(['interno', 'externo'])],
            'palabra_clave' => ['required', 'string', 'max:100'],
            'archivo' => ['required', 'file', 'mimes:pdf', 'max:4096'],
            'comentario_envio' => ['required', 'string', 'max:2000'],
        ];
    }
}
