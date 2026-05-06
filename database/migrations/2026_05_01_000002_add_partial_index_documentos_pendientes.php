<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Partial indexes requieren DDL raw; no usan transacción implícita de Laravel
    public $withinTransaction = false;

    public function up(): void
    {
        // Índice parcial para userStats.pendientes:
        //   WHERE user_id = ? AND recibido IN ('recibido','en_revision') AND deleted_at IS NULL
        // Al ser parcial solo indexa filas activas+pendientes, no todo el historial.
        DB::statement("
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documentos_pendientes_activos
            ON documentos (user_id)
            WHERE deleted_at IS NULL
              AND recibido IN ('recibido', 'en_revision')
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_documentos_pendientes_activos');
    }
};
