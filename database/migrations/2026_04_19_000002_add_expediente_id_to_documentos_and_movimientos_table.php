<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            $table->foreignId('expediente_id')
                ->nullable()
                ->after('hilo_id')
                ->constrained('expedientes', 'id_expediente')
                ->onDelete('set null');
        });

        Schema::table('movimientos', function (Blueprint $table) {
            $table->foreignId('expediente_id')
                ->nullable()
                ->after('documento_id')
                ->constrained('expedientes', 'id_expediente')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropForeign(['expediente_id']);
            $table->dropColumn('expediente_id');
        });

        Schema::table('documentos', function (Blueprint $table) {
            $table->dropForeign(['expediente_id']);
            $table->dropColumn('expediente_id');
        });
    }
};
