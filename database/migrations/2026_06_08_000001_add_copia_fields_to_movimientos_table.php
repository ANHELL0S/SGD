<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos', function (Blueprint $table): void {
            $table->boolean('es_copia')->default(false)->after('a_area_id');
            $table->unsignedBigInteger('movimiento_original_id')->nullable()->after('es_copia');

            $table->foreign('movimiento_original_id')
                ->references('id_movimiento')
                ->on('movimientos')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table): void {
            $table->dropForeign(['movimiento_original_id']);
            $table->dropColumn(['es_copia', 'movimiento_original_id']);
        });
    }
};
