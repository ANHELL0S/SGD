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
        Schema::table('movimientos', function (Blueprint $table): void {
            $table->foreignId('destinatario_user_id')
                ->nullable()
                ->after('a_area_id')
                ->constrained('users', 'id_user')
                ->nullOnDelete();

            $table->index(['a_area_id', 'destinatario_user_id'], 'movimientos_area_destinatario_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table): void {
            $table->dropIndex('movimientos_area_destinatario_index');
            $table->dropConstrainedForeignId('destinatario_user_id');
        });
    }
};
