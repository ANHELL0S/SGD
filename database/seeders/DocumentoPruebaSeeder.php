<?php

namespace Database\Seeders;

use App\Models\Documento;
use Illuminate\Database\Seeder;

class DocumentoPruebaSeeder extends Seeder
{
    public function run(): void
    {
        $cantidad = (int) $this->command->ask('¿Cuántos documentos de prueba insertar?', 10000);

        $this->command->info("Insertando {$cantidad} documentos...");

        // Chunks de 100 para no saturar memoria ni abrir transacciones enormes.
        // Cada Documento::create() dispara el observer → estadisticas_documentos se actualiza.
        $bar = $this->command->getOutput()->createProgressBar($cantidad);
        $bar->start();

        collect(range(1, $cantidad))
            ->chunk(100)
            ->each(function ($chunk) use ($bar) {
                $chunk->each(function () use ($bar) {
                    Documento::factory()->create();
                    $bar->advance();
                });
            });

        $bar->finish();
        $this->command->newLine();
        $this->command->info('Listo. estadisticas_documentos actualizado automáticamente.');
    }
}
