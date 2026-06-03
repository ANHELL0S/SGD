<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Renombrar duplicados activos en areas antes de crear el índice único
        $this->deduplicar('areas', 'id_area', 'nombre');

        // Renombrar duplicados activos en remitentes antes de crear el índice único
        $this->deduplicar('remitentes', 'id_remitente', 'nombre');

        // Índice único parcial: solo registros activos (deleted_at IS NULL).
        // Un área/remitente en papelera no bloquea crear uno nuevo con el mismo nombre.
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS areas_nombre_active_unique ON areas (nombre) WHERE deleted_at IS NULL');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS remitentes_nombre_active_unique ON remitentes (nombre) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS areas_nombre_active_unique');
        DB::statement('DROP INDEX IF EXISTS remitentes_nombre_active_unique');
    }

    /**
     * Para cada nombre duplicado en registros activos, agrega un sufijo " (2)", " (3)", etc.
     * al segundo y siguientes registros, conservando el primero (el de menor id) intacto.
     */
    private function deduplicar(string $tabla, string $pk, string $campo): void
    {
        $duplicados = DB::select("
            SELECT {$campo}
            FROM {$tabla}
            WHERE deleted_at IS NULL
            GROUP BY {$campo}
            HAVING COUNT(*) > 1
        ");

        foreach ($duplicados as $row) {
            $nombre = $row->{$campo};

            // Obtener todos los registros activos con ese nombre, ordenados por id (el primero queda igual)
            $registros = DB::select("
                SELECT {$pk}
                FROM {$tabla}
                WHERE {$campo} = ? AND deleted_at IS NULL
                ORDER BY {$pk} ASC
            ", [$nombre]);

            // El primero se conserva; los siguientes reciben sufijo
            foreach (array_slice($registros, 1) as $i => $reg) {
                $sufijo = ' (' . ($i + 2) . ')';
                DB::update("UPDATE {$tabla} SET {$campo} = ? WHERE {$pk} = ?", [
                    $nombre . $sufijo,
                    $reg->{$pk},
                ]);
            }
        }
    }
};
