<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs', function (Blueprint $table) {
            $table->id('id_log');
            $table->string('tipo', 30);
            $table->text('mensaje');

            // Información HTTP
            $table->string('metodo_http', 10)->nullable(); // GET, POST, PUT, DELETE, etc.
            $table->string('endpoint', 255)->nullable();   // /api/users, /admin/documentos, etc.
            $table->integer('status_code')->nullable();    // 200, 404, 500, etc.
            $table->integer('tiempo_respuesta')->nullable(); // en milisegundos

            // Contexto adicional (JSON flexible)
            $table->json('contexto')->nullable();

            // Payloads
            $table->longText('request_payload')->nullable();
            $table->longText('response_payload')->nullable();

            $table->foreignId('user_id')->nullable()->constrained('users', 'id_user')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tipo');
            $table->index('metodo_http');
            $table->index('status_code');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs');
    }
};
