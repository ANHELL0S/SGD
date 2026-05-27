<?php

namespace App\Http\Requests\User;

use App\Models\Documento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Valida la creación de un nuevo documento (oficio).
 *
 * El archivo debe ser PDF de máximo 2 MB. El número de oficio es opcional
 * pero, si se proporciona, debe ser único en la tabla `documentos` (excluyendo
 * los eliminados con soft delete).
 */
class StoreDocumentoRequest extends FormRequest
{
    /**
     * Solo usuarios autenticados pueden crear documentos.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Reglas de validación del nuevo documento.
     *
     * - `numero_oficio`: opcional, único sin trashed, máx. 100 caracteres.
     * - `asunto`:        obligatorio, máx. 255 caracteres.
     * - `fecha_oficio`:  obligatoria, formato fecha.
     * - `remitente_id`:  obligatorio, debe existir en `remitentes`.
     * - `tipo`:          obligatorio, uno de: interno, externo.
     * - `palabra_clave`: obligatoria, máx. 30 caracteres.
     * - `archivo`:       obligatorio, PDF, máx. 2048 KB.
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
