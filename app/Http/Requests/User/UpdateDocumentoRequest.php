<?php

namespace App\Http\Requests\User;

use App\Models\Documento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Valida la actualización de un documento (oficio) existente.
 *
 * Igual que {@see StoreDocumentoRequest} salvo que:
 * - El archivo es opcional (solo se reemplaza si se sube uno nuevo).
 * - La unicidad del número de oficio excluye el documento actual (`ignore`).
 */
class UpdateDocumentoRequest extends FormRequest
{
    /**
     * Solo usuarios autenticados pueden actualizar documentos.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Reglas de validación para la actualización del documento.
     *
     * - `numero_oficio`: opcional, único sin trashed ignorando el documento actual.
     * - `asunto`:        obligatorio, máx. 255 caracteres.
     * - `fecha_oficio`:  obligatoria, formato fecha.
     * - `remitente_id`:  obligatorio, debe existir en `remitentes`.
     * - `tipo`:          obligatorio, uno de: interno, externo.
     * - `palabra_clave`: obligatoria, máx. 30 caracteres.
     * - `archivo`:       opcional, PDF, máx. 2048 KB (si se envía reemplaza el actual).
     *
     * @return array<string, array<int, ValidationRule|string>|string>
     */
    public function rules(): array
    {
        $documento = Documento::query()->find($this->route('documento'));

        return [
            'numero_oficio' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique(Documento::class, 'numero_oficio')
                    ->withoutTrashed()
                    ->ignore($documento),
            ],
            'asunto' => ['required', 'string', 'max:255'],
            'fecha_oficio' => ['required', 'date'],
            'remitente_id' => ['required', 'integer', Rule::exists('remitentes', 'id_remitente')],
            'tipo' => ['required', Rule::in(['interno', 'externo'])],
            'palabra_clave' => ['required', 'string', 'max:30'],
            'archivo' => ['nullable', 'file', 'mimes:pdf', 'max:2048'],
        ];
    }
}
