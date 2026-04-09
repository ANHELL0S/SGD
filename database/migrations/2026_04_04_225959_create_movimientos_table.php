<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('movimientos', function (Blueprint $table) {
            $table->id('id_movimiento');
            $table->foreignId('documento_id')->constrained('documentos', 'id_documento')->onDelete('cascade');
            $table->foreignId('de_area_id')->constrained('areas', 'id_area')->onDelete('cascade');
            $table->foreignId('a_area_id')->constrained('areas', 'id_area')->onDelete('cascade');
            $table->foreignId('enviado_por')->constrained('users', 'id_user')->onDelete('cascade');
            $table->text('comentario')->nullable();
            $table->dateTime('fecha_recepcion')->nullable();
            $table->dateTime('fecha_envio');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos');
    }
};
