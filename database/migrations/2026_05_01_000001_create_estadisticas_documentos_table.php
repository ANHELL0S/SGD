<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estadisticas_documentos', function (Blueprint $table) {
            // Clave primaria compuesta — garantiza exactamente una fila por (usuario, día)
            $table->unsignedBigInteger('user_id');
            $table->date('fecha');          // Derivada de fecha_oficio, nunca de created_at
            $table->unsignedInteger('total')->default(0);
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->primary(['user_id', 'fecha']);

            $table->foreign('user_id')
                  ->references('id_user')
                  ->on('users')
                  ->onDelete('cascade');

            // Índice para consultas de rango de fechas sin filtro por usuario
            // (dashboards globales, reportes de administrador)
            $table->index('fecha', 'idx_estadisticas_fecha');

            // Índice para consultas de un usuario en rango de fechas arbitrario
            // La PK (user_id, fecha) ya cubre este patrón como prefijo izquierdo
            // pero lo declaramos explícito para claridad y para cubrir ORDER BY fecha DESC
            $table->index(['user_id', 'fecha'], 'idx_estadisticas_user_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estadisticas_documentos');
    }
};
