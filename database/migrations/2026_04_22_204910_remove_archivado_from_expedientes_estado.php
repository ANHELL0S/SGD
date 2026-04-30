<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE expedientes MODIFY COLUMN estado ENUM('abierto', 'cerrado') NOT NULL DEFAULT 'abierto'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE expedientes MODIFY COLUMN estado ENUM('abierto', 'cerrado', 'archivado') NOT NULL DEFAULT 'abierto'");
    }
};
