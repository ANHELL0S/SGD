<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documentos', function (Blueprint $table): void {
            $table->unsignedBigInteger('hilo_id')->nullable()->after('documento_padre_id');
            $table->timestamp('conversacion_cerrada_at')->nullable()->after('hilo_id');
            $table->unsignedBigInteger('conversacion_cerrada_por_user_id')->nullable()->after('conversacion_cerrada_at');

            $table->index('hilo_id');
            $table->foreign('hilo_id')->references('id_documento')->on('documentos')->nullOnDelete();
            $table->foreign('conversacion_cerrada_por_user_id')->references('id_user')->on('users')->nullOnDelete();
        });

        DB::table('documentos')->whereNull('hilo_id')->update([
            'hilo_id' => DB::raw('id_documento'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documentos', function (Blueprint $table): void {
            $table->dropForeign(['hilo_id']);
            $table->dropForeign(['conversacion_cerrada_por_user_id']);
            $table->dropIndex(['hilo_id']);

            $table->dropColumn([
                'hilo_id',
                'conversacion_cerrada_at',
                'conversacion_cerrada_por_user_id',
            ]);
        });
    }
};
