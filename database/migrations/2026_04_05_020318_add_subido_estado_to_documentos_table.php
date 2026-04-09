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
        Schema::table('documentos', function (Blueprint $table) {
            $table->enum('recibido', ['subido', 'recibido', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'respondido'])
                ->default('subido')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            $table->enum('recibido', ['recibido', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'respondido'])
                ->default('recibido')
                ->change();
        });
    }
};
