<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE expedientes DROP CONSTRAINT IF EXISTS expedientes_estado_check");
        DB::statement("ALTER TABLE expedientes ADD CONSTRAINT expedientes_estado_check CHECK (estado IN ('abierto', 'cerrado'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE expedientes DROP CONSTRAINT IF EXISTS expedientes_estado_check");
        DB::statement("ALTER TABLE expedientes ADD CONSTRAINT expedientes_estado_check CHECK (estado IN ('abierto', 'cerrado', 'archivado'))");
    }
};
