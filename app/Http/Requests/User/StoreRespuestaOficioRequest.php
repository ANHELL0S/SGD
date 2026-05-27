<?php

namespace App\Http\Requests\User;

use App\Models\Documento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Valida la respuesta a un movimiento, en sus dos modalidades:
 *
 * - **Solo comentario** (`solo_comentario = true`): solo requiere el texto del comentario;
 *   los campos del documento (archivo, remitente, fecha, etc.) son opcionales.
 * - **Con documento** (`solo_comentario = false`): exige archivo PDF, remitente, fecha
 *   y palabra clave; el número de oficio es opcional pero único si se proporciona.
 *
 * Las reglas se determinan dinámicamente en función del flag `solo_comentario`.
 */
class StoreRespuestaOficioRequest extends FormRequest
{
    /**
     * Solo usuarios autenticados pueden responder movimientos.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Reglas de validación de la respuesta.
     *
     * Campos siempre requeridos:
     * - `movimiento_id`:  debe existir en `movimientos`.
     * - `comentario_envio`: obligatorio, máx. 2000 caracteres.
     *
     * Campos condicionados a `solo_comentario = false`:
     * - `numero_oficio`: único sin trashed, máx. 100 caracteres.
     * - `fecha_oficio`:  obligatoria, formato fecha.
     * - `remitente_id`:  obligatorio, debe existir en `remitentes`.
     * - `tipo`:          obligatorio, solo `interno`.
     * - `palabra_clave`: obligatoria, máx. 100 caracteres.
     * - `archivo`:       obligatorio, PDF, máx. 4096 KB.
     *
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
