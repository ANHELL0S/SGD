<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos', function (Blueprint $table): void {
            $table->text('respuesta_comentario')->nullable()->after('comentario');
        });
    }

    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table): void {
            $table->dropColumn('respuesta_comentario');
        });
    }
};
