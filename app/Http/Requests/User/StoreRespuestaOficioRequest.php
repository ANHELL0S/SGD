<?php

namespace App\Http\Requests\User;

use App\Models\Documento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRespuestaOficioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, ValidationRule|string>|string>
     */
    public function rules(): array
    {
        $soloComentario = $this->boolean('solo_comentario');

        return [
            'movimiento_id'   => ['required', 'integer', Rule::exists('movimientos', 'id_movimiento')],
            'solo_comentario' => ['boolean'],
            'comentario_envio' => ['required', 'string', 'max:2000'],

            // Solo requeridos cuando se adjunta un documento
            'numero_oficio' => $soloComentario
                ? ['nullable', 'string', 'max:100']
                : ['nullable', 'string', 'max:100', Rule::unique(Documento::class, 'numero_oficio')->withoutTrashed()],
            'fecha_oficio'  => $soloComentario ? ['nullable', 'date'] : ['required', 'date'],
            'remitente_id'  => $soloComentario
                ? ['nullable', 'integer']
                : ['required', 'integer', Rule::exists('remitentes', 'id_remitente')],
            'tipo'          => $soloComentario ? ['nullable', 'string'] : ['required', Rule::in(['interno'])],
            'palabra_clave' => $soloComentario ? ['nullable', 'string', 'max:100'] : ['required', 'string', 'max:100'],
            'archivo'       => $soloComentario
                ? ['nullable']
                : ['required', 'file', 'mimes:pdf', 'max:4096'],
        ];
    }
}
