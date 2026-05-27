<?php

namespace App\Http\Requests\User;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Valida el envío de un documento a otra área (creación de un movimiento).
 *
 * El destinatario debe ser un usuario aprobado, habilitado y perteneciente
 * al área destino indicada en `a_area_id`.
 */
class StoreMovimientoRequest extends FormRequest
{
    /**
     * Solo usuarios autenticados pueden enviar documentos.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Reglas de validación del movimiento.
     *
     * - `id_documento`:        obligatorio, debe existir en `documentos` sin soft delete.
     * - `a_area_id`:           obligatorio, debe existir en `areas`.
     * - `destinatario_user_id`: obligatorio, debe ser usuario aprobado, habilitado y del área destino.
     * - `comentario`:          obligatorio, máx. 400 caracteres.
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
            'comentario' => ['required', 'string', 'max:400'],
        ];
    }
}
