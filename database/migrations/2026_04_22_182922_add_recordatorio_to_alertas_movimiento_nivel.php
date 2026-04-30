<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE alertas_movimiento MODIFY COLUMN nivel ENUM('media', 'alta', 'bloqueado', 'recordatorio') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE alertas_movimiento MODIFY COLUMN nivel ENUM('media', 'alta', 'bloqueado') NOT NULL");
    }
};
