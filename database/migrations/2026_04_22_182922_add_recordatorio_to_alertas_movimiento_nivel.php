<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE alertas_movimiento DROP CONSTRAINT IF EXISTS alertas_movimiento_nivel_check");
        DB::statement("ALTER TABLE alertas_movimiento ADD CONSTRAINT alertas_movimiento_nivel_check CHECK (nivel IN ('media', 'alta', 'bloqueado', 'recordatorio'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE alertas_movimiento DROP CONSTRAINT IF EXISTS alertas_movimiento_nivel_check");
        DB::statement("ALTER TABLE alertas_movimiento ADD CONSTRAINT alertas_movimiento_nivel_check CHECK (nivel IN ('media', 'alta', 'bloqueado'))");
    }
};
