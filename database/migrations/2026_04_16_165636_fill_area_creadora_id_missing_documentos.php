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
        // Rellenar area_creadora_id con el área del usuario que creó el documento
        Schema::table('documentos', function (Blueprint $table) {
            DB::statement('
                UPDATE documentos
                SET area_creadora_id = (
                    SELECT u.area_id
                    FROM users u
                    WHERE u.id_user = documentos.user_id
                )
                WHERE area_creadora_id IS NULL
            ');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documentos', function (Blueprint $table) {
            DB::statement('UPDATE documentos SET area_creadora_id = NULL');
        });
    }
};
