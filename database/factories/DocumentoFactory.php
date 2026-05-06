<?php

namespace Database\Factories;

use App\Models\Documento;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentoFactory extends Factory
{
    protected $model = Documento::class;

    public function definition(): array
    {
        $userId = $this->faker->randomElement([2, 3]);
        $areaId = $userId === 2 ? 2 : 1;

        return [
            'numero_oficio'    => 'OF-' . $this->faker->unique()->numerify('####') . '-' . date('Y'),
            'asunto'           => $this->faker->sentence(6),
            'fecha_oficio'     => $this->faker->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'remitente_id'     => $this->faker->randomElement([1, 2, 3, 4]),
            'tipo'             => $this->faker->randomElement(['interno', 'externo']),
            'palabra_clave'    => $this->faker->randomElement(['GESTIÓN', 'SOLICITUD', 'OFICIO', 'REQUERIMIENTO']),
            'archivo'          => 'documentos/prueba_' . $this->faker->numerify('####') . '.pdf',
            'contenido_ocr'    => $this->faker->optional(0.7)->paragraph(),
            'area_actual_id'   => $areaId,
            'area_creadora_id' => $areaId,
            'user_id'          => $userId,
            'recibido'         => $this->faker->randomElement(['recibido', 'enviado', 'subido']),
        ];
    }
}
