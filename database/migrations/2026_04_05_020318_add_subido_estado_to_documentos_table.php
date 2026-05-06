<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE documentos DROP CONSTRAINT IF EXISTS documentos_recibido_check");
        DB::statement("ALTER TABLE documentos ADD CONSTRAINT documentos_recibido_check CHECK (recibido IN ('subido', 'recibido', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'respondido'))");
        DB::statement("ALTER TABLE documentos ALTER COLUMN recibido SET DEFAULT 'subido'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE documentos DROP CONSTRAINT IF EXISTS documentos_recibido_check");
        DB::statement("ALTER TABLE documentos ADD CONSTRAINT documentos_recibido_check CHECK (recibido IN ('recibido', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'respondido'))");
        DB::statement("ALTER TABLE documentos ALTER COLUMN recibido SET DEFAULT 'recibido'");
    }
};
