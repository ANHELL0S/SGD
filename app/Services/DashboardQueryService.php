<?php

namespace App\Services;

use App\Models\AlertaMovimiento;
use App\Models\Area;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardQueryService
{
    private const TTL_STATS  = 300;   // 5 min  — conteos en tiempo real
    private const TTL_CHARTS = 900;   // 15 min — datos históricos de gráficos
    private const TTL_AREA   = 600;   // 10 min — agrupaciones secundarias

    // ── Admin ─────────────────────────────────────────────────────────────────

    public function adminStats(): array
    {
        return Cache::remember('dashboard_admin_stats', self::TTL_STATS, function () {
            $alertasRaw = AlertaMovimiento::query()
                ->whereNull('leido_at')
                ->selectRaw('nivel, COUNT(*) as total')
                ->groupBy('nivel')
                ->pluck('total', 'nivel')
                ->toArray();

            // Un solo scan de users en vez de dos queries separados
            $userCounts = User::query()
                ->selectRaw("
                    COUNT(*) FILTER (WHERE rol = 'user' AND estado = 'aprobado' AND habilitado = true) AS activos,
                    COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes
                ")
                ->first();

            return [
                'usuariosActivos'      => (int) $userCounts->activos,
                'pendientesAprobacion' => (int) $userCounts->pendientes,
                'totalDocumentos'      => (int) DB::table('estadisticas_documentos')->sum('total'),
                'alertasActivas'       => array_sum($alertasRaw),
                'alertasRaw'           => $alertasRaw,
            ];
        });
    }

    /**
     * Devuelve ['YYYY-MM' => total] para los últimos 6 meses del sistema.
     * Lee estadisticas_documentos (SUM sobre fecha_oficio) en lugar de escanear documentos.
     */
    public function adminPorMes(): array
    {
        return Cache::remember('dashboard_admin_por_mes_v2', self::TTL_CHARTS, function () {
            return DB::table('estadisticas_documentos')
                ->where('fecha', '>=', now()->subMonths(5)->startOfMonth()->toDateString())
                ->selectRaw("TO_CHAR(fecha, 'YYYY-MM') AS period, SUM(total) AS total")
                ->groupByRaw("TO_CHAR(fecha, 'YYYY-MM')")
                ->pluck('total', 'period')
                ->toArray();
        });
    }

    /**
     * JOIN explícito en lugar de withCount() con subconsulta correlacionada por fila.
     * Un solo GROUP BY en vez de N subqueries.
     */
    public function adminPorArea(): array
    {
        return Cache::remember('dashboard_admin_por_area', self::TTL_AREA, function () {
            return Area::query()
                ->select('areas.id_area', 'areas.nombre')
                ->selectRaw('COUNT(documentos.id_documento) AS total')
                ->join('documentos', function ($join) {
                    $join->on('areas.id_area', '=', 'documentos.area_actual_id')
                         ->whereNull('documentos.deleted_at');
                })
                ->groupBy('areas.id_area', 'areas.nombre')
                ->orderByDesc('total')
                ->limit(7)
                ->get()
                ->map(fn (Area $a) => ['area' => $a->nombre, 'total' => (int) $a->total])
                ->toArray();
        });
    }

    public function adminUsuariosPendientes(): Collection
    {
        return User::query()
            ->where('estado', 'pendiente')
            ->with('area:id_area,nombre')
            ->orderBy('created_at')
            ->limit(8)
            ->get(['id_user', 'nombre', 'apellido', 'email', 'area_id', 'created_at']);
    }

    // ── User ──────────────────────────────────────────────────────────────────

    /**
     * Invalida el caché de stats para todos los usuarios de las áreas dadas.
     * Llamar antes de emitir el evento WebSocket para que el reload traiga datos frescos.
     *
     * @param int[] $areaIds
     */
    public function invalidarStatsDeAreas(array $areaIds): void
    {
        $areaIds = array_values(array_filter($areaIds));
        if (empty($areaIds)) {
            return;
        }

        User::whereIn('area_id', $areaIds)
            ->pluck('id_user')
            ->each(fn (int $userId) => Cache::forget("dashboard_user_{$userId}_stats"));
    }

    /**
     * Conteos operacionales sensibles al tiempo: pendientes y movimientos activos.
     */
    public function userStats(int $userId, ?int $areaId): array
    {
        return Cache::remember("dashboard_user_{$userId}_stats", self::TTL_STATS, function () use ($userId, $areaId) {
            $pendientes = Documento::query()
                ->where('user_id', $userId)
                ->whereIn('recibido', ['recibido', 'en_revision'])
                ->where(function (Builder $q): void {
                    $q->whereNull('expediente_id')
                        ->orWhereHas('expediente', fn (Builder $q) => $q->where('estado', 'abierto'));
                })
                ->count();

            $movimientosPendientes = 0;
            if ($areaId !== null) {
                $movimientosPendientes = Movimiento::query()
                    ->where('a_area_id', $areaId)
                    ->where(function (Builder $q) use ($userId): void {
                        $q->whereNull('destinatario_user_id')
                            ->orWhere('destinatario_user_id', $userId);
                    })
                    ->where(function (Builder $q): void {
                        $q->whereNull('expediente_id')
                            ->orWhereHas('expediente', fn (Builder $q) => $q->where('estado', 'abierto'));
                    })
                    ->whereDoesntHave('documentosGenerados')
                    ->where('fecha_envio', '>=', now()->subDays(12))
                    ->count();
            }

            return [
                'pendientes'            => $pendientes,
                'movimientosPendientes' => $movimientosPendientes,
            ];
        });
    }

    /**
     * Una sola query GROUP BY (recibido, tipo) reemplaza dos queries separadas.
     * La agregación por dimensión se hace en PHP sobre el resultado ya filtrado.
     */
    public function userPorEstadoTipo(int $userId): array
    {
        return Cache::remember("dashboard_user_{$userId}_por_estado_tipo", self::TTL_AREA, function () use ($userId) {
            $breakdown = Documento::query()
                ->where('user_id', $userId)
                ->selectRaw('recibido, tipo, COUNT(*) AS total')
                ->groupBy('recibido', 'tipo')
                ->get();

            $porEstadoRaw = [];
            $porTipoRaw   = [];

            foreach ($breakdown as $row) {
                $porEstadoRaw[$row->recibido] = ($porEstadoRaw[$row->recibido] ?? 0) + (int) $row->total;
                $porTipoRaw[$row->tipo]       = ($porTipoRaw[$row->tipo]       ?? 0) + (int) $row->total;
            }

            return [
                'porEstadoRaw'    => $porEstadoRaw,
                'porTipoRaw'      => $porTipoRaw,
                'totalDocumentos' => array_sum($porEstadoRaw),
                'respondidos'     => $porEstadoRaw['respondido'] ?? 0,
            ];
        });
    }

    /**
     * Devuelve el raw array indexado por period para que el controller construya el shape final.
     * Lee estadisticas_documentos (SUM sobre fecha_oficio) en lugar de escanear documentos.
     * WHERE siempre es un rango sobre la columna indexada `fecha` (index-only scan posible).
     */
    public function userPorMes(int $userId, int $meses): array
    {
        if ($meses === 1) {
            return Cache::remember("dashboard_user_{$userId}_por_mes_1_v2", self::TTL_CHARTS, function () use ($userId) {
                return DB::table('estadisticas_documentos')
                    ->where('user_id', $userId)
                    ->where('fecha', '>=', now()->subDays(29)->toDateString())
                    ->selectRaw('fecha AS period, SUM(total) AS total')
                    ->groupBy('fecha')
                    ->pluck('total', 'period')
                    ->toArray();
            });
        }

        if ($meses === 3) {
            return Cache::remember("dashboard_user_{$userId}_por_mes_3_v2", self::TTL_CHARTS, function () use ($userId) {
                return DB::table('estadisticas_documentos')
                    ->where('user_id', $userId)
                    ->where('fecha', '>=', now()->startOfWeek()->subWeeks(11)->toDateString())
                    ->selectRaw("date_trunc('week', fecha)::date AS period, SUM(total) AS total")
                    ->groupByRaw("date_trunc('week', fecha)::date")
                    ->pluck('total', 'period')
                    ->toArray();
            });
        }

        return Cache::remember("dashboard_user_{$userId}_por_mes_6_v2", self::TTL_CHARTS, function () use ($userId) {
            return DB::table('estadisticas_documentos')
                ->where('user_id', $userId)
                ->where('fecha', '>=', now()->subMonths(5)->startOfMonth()->toDateString())
                ->selectRaw("TO_CHAR(fecha, 'YYYY-MM') AS period, SUM(total) AS total")
                ->groupByRaw("TO_CHAR(fecha, 'YYYY-MM')")
                ->pluck('total', 'period')
                ->toArray();
        });
    }

    // ── Period-aware ──────────────────────────────────────────────────────────

    public function totalDocumentosPeriodo(?string $desde, ?string $hasta, ?int $userId = null): int
    {
        $key = $userId !== null
            ? "dash_user_{$userId}_total_{$desde}_{$hasta}"
            : "dash_admin_total_{$desde}_{$hasta}";

        return (int) Cache::remember($key, self::TTL_STATS, function () use ($userId, $desde, $hasta) {
            $query = DB::table('estadisticas_documentos')
                ->when($userId !== null, fn ($q) => $q->where('user_id', $userId));
            if ($desde && $hasta) {
                $query->whereBetween('fecha', [$desde, $hasta]);
            }
            return $query->sum('total');
        });
    }

    public function porMesPeriodo(string $periodo, ?string $desde, ?string $hasta, ?int $userId = null): array
    {
        $key = $userId !== null
            ? "dash_user_{$userId}_chart_{$periodo}"
            : "dash_admin_chart_{$periodo}";

        return Cache::remember($key, self::TTL_CHARTS, function () use ($periodo, $desde, $hasta, $userId) {
            $query = DB::table('estadisticas_documentos')
                ->when($userId !== null, fn ($q) => $q->where('user_id', $userId));
            if ($desde && $hasta) {
                $query->whereBetween('fecha', [$desde, $hasta]);
            }

            if ($periodo === 'año') {
                return $query
                    ->selectRaw("TO_CHAR(fecha, 'YYYY-MM') AS period, SUM(total) AS total")
                    ->groupByRaw("TO_CHAR(fecha, 'YYYY-MM')")
                    ->pluck('total', 'period')
                    ->toArray();
            }

            // hoy, semana, mes → un punto por día
            return $query
                ->selectRaw('fecha::text AS period, SUM(total) AS total')
                ->groupBy('fecha')
                ->orderBy('fecha')
                ->pluck('total', 'period')
                ->toArray();
        });
    }

    public function userPorEstadoTipoPeriodo(int $userId, ?string $desde, ?string $hasta): array
    {
        $key = "dash_user_{$userId}_estadotipo_{$desde}_{$hasta}";

        return Cache::remember($key, self::TTL_AREA, function () use ($userId, $desde, $hasta) {
            $query = Documento::query()
                ->where('user_id', $userId);
            if ($desde && $hasta) {
                $query->whereBetween('fecha_oficio', [$desde, $hasta]);
            }
            $breakdown = $query
                ->selectRaw('recibido, tipo, COUNT(*) AS total')
                ->groupBy('recibido', 'tipo')
                ->get();

            $porEstadoRaw = [];
            $porTipoRaw   = [];

            foreach ($breakdown as $row) {
                $porEstadoRaw[$row->recibido] = ($porEstadoRaw[$row->recibido] ?? 0) + (int) $row->total;
                $porTipoRaw[$row->tipo]       = ($porTipoRaw[$row->tipo]       ?? 0) + (int) $row->total;
            }

            return ['porEstadoRaw' => $porEstadoRaw, 'porTipoRaw' => $porTipoRaw];
        });
    }

    public function adminPorAreaPeriodo(?string $desde, ?string $hasta): array
    {
        $key = "dash_admin_area_{$desde}_{$hasta}";

        return Cache::remember($key, self::TTL_AREA, function () use ($desde, $hasta) {
            $query = Area::query()
                ->select('areas.id_area', 'areas.nombre')
                ->selectRaw('COUNT(documentos.id_documento) AS total')
                ->join('documentos', function ($join) use ($desde, $hasta) {
                    $join->on('areas.id_area', '=', 'documentos.area_actual_id')
                         ->whereNull('documentos.deleted_at');
                    if ($desde && $hasta) {
                        $join->whereBetween('documentos.fecha_oficio', [$desde, $hasta]);
                    }
                })
                ->groupBy('areas.id_area', 'areas.nombre')
                ->orderByDesc('total')
                ->limit(7)
                ->get()
                ->map(fn (Area $a) => ['area' => $a->nombre, 'total' => (int) $a->total])
                ->toArray();
            return $query;
        });
    }

    public function userUltimosDocumentos(int $userId): Collection
    {
        return Documento::query()
            ->where('user_id', $userId)
            ->with([
                'remitente:id_remitente,nombre',
                'area:id_area,nombre',
            ])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id_documento', 'numero_oficio', 'asunto', 'tipo', 'recibido', 'fecha_oficio', 'remitente_id', 'area_actual_id', 'created_at']);
    }
}
