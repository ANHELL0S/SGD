<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillEstadisticasDocumentos extends Command
{
    protected $signature = 'estadisticas:backfill
                            {--dry-run : Muestra cuántas filas se insertarían sin ejecutar}';

    protected $description = 'Llena estadisticas_documentos con datos históricos de documentos';

    public function handle(): int
    {
        if ($this->option('dry-run')) {
            return $this->runDryRun();
        }

        $filasPrevias = DB::table('estadisticas_documentos')->count();

        $this->info("Filas actuales en estadisticas_documentos: {$filasPrevias}");
        $this->info('Ejecutando backfill...');

        $start = microtime(true);

        // Upsert histórico en un solo statement atómico.
        // ON CONFLICT usa EXCLUDED.total (valor recién calculado) para que
        // re-ejecuciones corrijan el dato en vez de acumular sobre él.
        DB::statement("
            INSERT INTO estadisticas_documentos (user_id, fecha, total, updated_at)
            SELECT
                user_id,
                fecha_oficio            AS fecha,
                COUNT(*)                AS total,
                NOW()                   AS updated_at
            FROM documentos
            WHERE deleted_at    IS NULL
              AND fecha_oficio   IS NOT NULL
              AND user_id        IS NOT NULL
            GROUP BY user_id, fecha_oficio
            ON CONFLICT (user_id, fecha) DO UPDATE
                SET total      = EXCLUDED.total,
                    updated_at = EXCLUDED.updated_at
        ");

        $elapsed   = round((microtime(true) - $start) * 1000, 1);
        $filasPost = DB::table('estadisticas_documentos')->count();
        $insertadas = $filasPost - $filasPrevias;

        $this->info("Completado en {$elapsed} ms.");
        $this->table(
            ['Filas previas', 'Filas insertadas', 'Total final'],
            [[$filasPrevias, $insertadas, $filasPost]]
        );

        return self::SUCCESS;
    }

    private function runDryRun(): int
    {
        $filas = DB::scalar("
            SELECT COUNT(*)
            FROM (
                SELECT user_id, fecha_oficio
                FROM documentos
                WHERE deleted_at  IS NULL
                  AND fecha_oficio IS NOT NULL
                  AND user_id      IS NOT NULL
                GROUP BY user_id, fecha_oficio
            ) grupos
        ");

        $this->info("[dry-run] Se insertarían/actualizarían {$filas} filas en estadisticas_documentos.");
        $this->info('[dry-run] No se realizó ningún cambio.');

        return self::SUCCESS;
    }
}
