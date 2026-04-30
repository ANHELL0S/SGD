<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alertas_movimiento', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'id_user')->cascadeOnDelete();
            $table->unsignedBigInteger('movimiento_id');
            $table->foreign('movimiento_id')->references('id_movimiento')->on('movimientos')->cascadeOnDelete();
            $table->enum('nivel', ['media', 'alta', 'bloqueado']);
            $table->string('asunto')->nullable();
            $table->timestamp('leido_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'leido_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas_movimiento');
    }
};
