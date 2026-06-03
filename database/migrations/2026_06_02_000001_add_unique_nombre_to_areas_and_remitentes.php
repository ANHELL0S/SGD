<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Índice único parcial: solo aplica a registros activos (no eliminados).
        // Así un área en papelera no bloquea crear una nueva con el mismo nombre.
        DB::statement('CREATE UNIQUE INDEX areas_nombre_active_unique ON areas (nombre) WHERE deleted_at IS NULL');
        DB::statement('CREATE UNIQUE INDEX remitentes_nombre_active_unique ON remitentes (nombre) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS areas_nombre_active_unique');
        DB::statement('DROP INDEX IF EXISTS remitentes_nombre_active_unique');
    }
};
