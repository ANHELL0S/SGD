<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            // Para admin: por_mes global sin filtro de user_id
            $table->index('created_at', 'idx_documentos_created_at');

            // Para admin: por_area JOIN sobre area_actual_id
            $table->index('area_actual_id', 'idx_documentos_area_actual');
        });
    }

    public function down(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            $table->dropIndex('idx_documentos_created_at');
            $table->dropIndex('idx_documentos_area_actual');
        });
    }
};
