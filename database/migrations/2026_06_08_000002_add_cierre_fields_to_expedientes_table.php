<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expedientes', function (Blueprint $table): void {
            $table->text('motivo_cierre')->nullable()->after('prioridad');
            $table->unsignedBigInteger('cerrado_por_user_id')->nullable()->after('motivo_cierre');
            $table->timestamp('cerrado_at')->nullable()->after('cerrado_por_user_id');

            $table->foreign('cerrado_por_user_id')
                ->references('id_user')
                ->on('users')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('expedientes', function (Blueprint $table): void {
            $table->dropForeign(['cerrado_por_user_id']);
            $table->dropColumn(['motivo_cierre', 'cerrado_por_user_id', 'cerrado_at']);
        });
    }
};
