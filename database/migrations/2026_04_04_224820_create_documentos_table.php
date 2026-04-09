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
        Schema::create('documentos', function (Blueprint $table) {
            $table->id('id_documento');
            $table->string('numero_oficio', 100)->nullable();
            $table->date('fecha_oficio');
            $table->foreignId('remitente_id')->constrained('remitentes', 'id_remitente')->onDelete('cascade');
            $table->enum('tipo', ['interno', 'externo']);
            $table->string('palabra_clave', 100);
            $table->string('archivo', 255);
            $table->longText('contenido_ocr')->nullable();
            $table->foreignId('area_actual_id')->constrained('areas', 'id_area')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users', 'id_user')->onDelete('cascade');
            $table->enum('recibido', ['recibido', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'respondido'])->default('recibido');
            $table->foreignId('documento_padre_id')->nullable()->constrained('documentos', 'id_documento')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documentos');
    }
};
