<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ValidarEstadisticasDocumentos extends Command
{
    protected $signature = 'estadisticas:validar
                            {--fix : Corrige las discrepancias ejecutando el backfill}';

    protected $description = 'Detecta inconsistencias entre documentos y estadisticas_documentos';

    public function handle(): int
    {
        $this->info('Comparando documentos vs estadisticas_documentos...');

        $discrepancias = $this->obtenerDiscrepancias();

        if ($discrepancias->isEmpty()) {
            $this->info('Sin discrepancias. Las tablas están sincronizadas.');
            return self::SUCCESS;
        }

        $this->warn("Se encontraron {$discrepancias->count()} fila(s) con diferencias:");

        $this->table(
            ['user_id', 'fecha', 'esperado (docs)', 'registrado (stats)', 'diferencia'],
            $discrepancias->map(fn ($r) => [
                $r->user_id,
                $r->fecha,
                $r->esperado,
                $r->registrado,
                ($r->diferencia > 0 ? '+' : '') . $r->diferencia,
            ])
        );

        Log::channel('documentos')->warning('Inconsistencia detectada en estadisticas_documentos', [
            'total_discrepancias' => $discrepancias->count(),
            'detalle'             => $discrepancias->toArray(),
        ]);

        if ($this->option('fix')) {
            $this->info('Ejecutando corrección (backfill)...');
            $this->call('estadisticas:backfill');
            $this->info('Verificando resultado post-corrección...');

            $restantes = $this->obtenerDiscrepancias();

            if ($restantes->isEmpty()) {
                $this->info('Corrección exitosa. Tablas sincronizadas.');
                return self::SUCCESS;
            }

            $this->error("Quedan {$restantes->count()} discrepancia(s) tras el fix. Revisar manualmente.");
            return self::FAILURE;
        }

        $this->line('');
        $this->line('Para corregir automáticamente: php artisan estadisticas:validar --fix');

        return self::FAILURE;
    }

    private function obtenerDiscrepancias(): Collection
    {
        // FULL OUTER JOIN detecta tres casos:
        //   1. Fila en stats sin documentos correspondientes (orphan)
        //   2. Documentos sin fila en stats (missing)
        //   3. Total correcto en docs pero incorrecto en stats (drift)
        $rows = DB::select("
            SELECT
                COALESCE(d.user_id,   e.user_id)::bigint  AS user_id,
                COALESCE(d.fecha,     e.fecha)::date       AS fecha,
                COALESCE(d.total_real, 0)::int             AS esperado,
                COALESCE(e.total,      0)::int             AS registrado,
                (COALESCE(d.total_real, 0) - COALESCE(e.total, 0))::int AS diferencia
            FROM (
                SELECT user_id, fecha_oficio AS fecha, COUNT(*) AS total_real
                FROM documentos
                WHERE deleted_at   IS NULL
                  AND fecha_oficio  IS NOT NULL
                  AND user_id       IS NOT NULL
                GROUP BY user_id, fecha_oficio
            ) d
            FULL OUTER JOIN estadisticas_documentos e
                ON  d.user_id = e.user_id
                AND d.fecha   = e.fecha
            WHERE COALESCE(d.total_real, 0) != COALESCE(e.total, 0)
            ORDER BY ABS(COALESCE(d.total_real, 0) - COALESCE(e.total, 0)) DESC
        ");

        return collect($rows);
    }
}
