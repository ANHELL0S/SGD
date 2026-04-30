<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            // Filtro por usuario + estado (pendientes, conteo por estado)
            $table->index(['user_id', 'recibido'], 'idx_documentos_user_recibido');
            // Filtro por usuario + fecha (gráfico mensual)
            $table->index(['user_id', 'created_at'], 'idx_documentos_user_created');
        });

        Schema::table('movimientos', function (Blueprint $table) {
            // Movimientos pendientes hacia un área en un rango de fechas
            $table->index(['a_area_id', 'fecha_envio'], 'idx_movimientos_area_fecha');
        });
    }

    public function down(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            $table->dropIndex('idx_documentos_user_recibido');
            $table->dropIndex('idx_documentos_user_created');
        });

        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropIndex('idx_movimientos_area_fecha');
        });
    }
};
