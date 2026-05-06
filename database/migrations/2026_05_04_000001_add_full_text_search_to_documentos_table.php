<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Extensión unaccent ─────────────────────────────────────────────
        DB::statement('CREATE EXTENSION IF NOT EXISTS unaccent');

        // ── 2. Columna search_vector ──────────────────────────────────────────
        DB::statement('ALTER TABLE documentos ADD COLUMN IF NOT EXISTS search_vector tsvector');

        // ── 3. Función del trigger ────────────────────────────────────────────
        DB::statement("
            CREATE OR REPLACE FUNCTION documentos_search_vector_update()
            RETURNS trigger
            LANGUAGE plpgsql
            AS \$\$
            BEGIN
                NEW.search_vector :=
                    setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW.numero_oficio, ''))), 'A') ||
                    setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW.asunto, ''))),        'A') ||
                    setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW.palabra_clave, ''))), 'B') ||
                    setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW.contenido_ocr, ''))), 'D');
                RETURN NEW;
            END;
            \$\$
        ");

        // ── 4. Trigger BEFORE INSERT OR UPDATE ───────────────────────────────
        DB::statement('DROP TRIGGER IF EXISTS documentos_search_vector_trigger ON documentos');
        DB::statement("
            CREATE TRIGGER documentos_search_vector_trigger
            BEFORE INSERT OR UPDATE OF numero_oficio, asunto, palabra_clave, contenido_ocr
            ON documentos
            FOR EACH ROW EXECUTE FUNCTION documentos_search_vector_update()
        ");

        // ── 5. Índice GIN ─────────────────────────────────────────────────────
        DB::statement('CREATE INDEX IF NOT EXISTS idx_documentos_search_vector ON documentos USING GIN(search_vector)');

        // ── 6. Backfill de filas existentes ───────────────────────────────────
        DB::statement("
            UPDATE documentos
            SET search_vector =
                setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(numero_oficio, ''))), 'A') ||
                setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(asunto, ''))),        'A') ||
                setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(palabra_clave, ''))), 'B') ||
                setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(contenido_ocr, ''))), 'D')
        ");
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS documentos_search_vector_trigger ON documentos');
        DB::statement('DROP FUNCTION IF EXISTS documentos_search_vector_update()');
        DB::statement('DROP INDEX IF EXISTS idx_documentos_search_vector');
        DB::statement('ALTER TABLE documentos DROP COLUMN IF EXISTS search_vector');
    }
};
