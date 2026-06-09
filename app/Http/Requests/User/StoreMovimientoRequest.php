<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Valida el envío de un documento a otra área (creación de un movimiento).
 *
 * El destinatario debe ser un usuario aprobado, habilitado y perteneciente
 * al área destino indicada en `a_area_id`.
 *
 * El campo `copias` es opcional y permite enviar copias informativas a otras
 * áreas/usuarios simultáneamente. Cada entrada debe tener `a_area_id` y
 * `destinatario_user_id` válidos, sin repetir el área del original ni entre copias.
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

            'copias'                          => ['nullable', 'array', 'max:10'],
            'copias.*.a_area_id'              => ['nullable', 'integer', Rule::exists('areas', 'id_area')],
            'copias.*.destinatario_user_id'   => ['nullable', 'integer', Rule::exists('users', 'id_user')],
        ];
    }

    /**
     * Validaciones cruzadas que no se pueden expresar con reglas simples:
     * - El usuario de cada copia debe pertenecer al área de esa copia y estar activo.
     * - El área de cada copia no puede repetirse ni coincidir con el área del original.
     *
     * @param  Validator $validator
     * @return void
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $copias = $this->input('copias', []);

            if (empty($copias)) {
                return;
            }

            $areaOriginal  = $this->integer('a_area_id');
            $areasUsadas   = [$areaOriginal];

            foreach ($copias as $i => $copia) {
                $aAreaId = isset($copia['a_area_id']) ? (int) $copia['a_area_id'] : null;
                $userId  = isset($copia['destinatario_user_id']) ? (int) $copia['destinatario_user_id'] : null;

                if ($aAreaId === null || $userId === null) {
                    continue;
                }

                // El área de la copia no puede ser igual al área del original
                if ($aAreaId === $areaOriginal) {
                    $validator->errors()->add(
                        "copias.{$i}.a_area_id",
                        'El área de la copia no puede ser la misma que el área del original.',
                    );
                    continue;
                }

                // No se permite enviar dos copias a la misma área
                if (in_array($aAreaId, $areasUsadas, true)) {
                    $validator->errors()->add(
                        "copias.{$i}.a_area_id",
                        'Ya existe una copia dirigida a esta área.',
                    );
                    continue;
                }

                $areasUsadas[] = $aAreaId;

                // El usuario debe estar activo y pertenecer al área indicada
                $existe = User::query()
                    ->where('id_user', $userId)
                    ->where('estado', 'aprobado')
                    ->where('habilitado', true)
                    ->where('area_id', $aAreaId)
                    ->exists();

                if (! $existe) {
                    $validator->errors()->add(
                        "copias.{$i}.destinatario_user_id",
                        'El usuario no pertenece al área seleccionada o no está habilitado.',
                    );
                }
            }
        });
    }

    /**
     * Mensajes de error personalizados para las reglas de copias.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'copias.max'                          => 'No puedes agregar más de 10 copias.',
            'copias.*.a_area_id.exists'           => 'El área de una copia no existe.',
            'copias.*.destinatario_user_id.exists' => 'El usuario de una copia no existe.',
        ];
    }
}
