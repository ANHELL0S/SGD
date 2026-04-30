<?php

namespace App\Http\Controllers;

use App\Models\AlertaMovimiento;
use App\Models\Area;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user?->rol === 'consultor') {
            return redirect()->route('consultor.expedientes.index');
        }

        if ($user?->rol === 'admin') {
            return Inertia::render('admin/dashboard', $this->adminDashboardData());
        }

        $meses = $request->integer('meses', 6);
        if (!in_array($meses, [1, 3, 6])) {
            $meses = 6;
        }

        return Inertia::render('user/dashboard', $this->userDashboardData($user, $meses));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    private function adminDashboardData(): array
    {
        $mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Stats cacheados 5 minutos — son conteos globales que cambian poco
        $stats = Cache::remember('dashboard_admin_stats', 300, function () {
            $alertasRaw = AlertaMovimiento::query()
                ->whereNull('leido_at')
                ->selectRaw('nivel, COUNT(*) as total')
                ->groupBy('nivel')
                ->pluck('total', 'nivel')
                ->toArray();

            return [
                'usuariosActivos'      => User::query()->where('rol', 'user')->where('estado', 'aprobado')->where('habilitado', true)->count(),
                'pendientesAprobacion' => User::query()->where('estado', 'pendiente')->count(),
                'totalDocumentos'      => Documento::query()->count(),
                'alertasActivas'       => array_sum($alertasRaw),
                'alertasRaw'           => $alertasRaw,
            ];
        });

        // Gráfico mensual: 1 query con GROUP BY en vez de 6 queries en loop
        // Devuelve array primitivo ['2026-4' => 12, ...] para evitar problemas de serialización
        $porMesRaw = Cache::remember('dashboard_admin_por_mes', 300, function () {
            return Documento::query()
                ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
                ->selectRaw("CONCAT(YEAR(created_at), '-', MONTH(created_at)) as period, COUNT(*) as total")
                ->groupByRaw("CONCAT(YEAR(created_at), '-', MONTH(created_at))")
                ->pluck('total', 'period')
                ->toArray();
        });

        $porMes = [];
        for ($i = 5; $i >= 0; $i--) {
            $fecha = now()->subMonths($i);
            $key   = $fecha->year . '-' . $fecha->month;
            $porMes[] = [
                'mes'   => $mesesLabels[$fecha->month - 1],
                'total' => (int) ($porMesRaw[$key] ?? 0),
            ];
        }

        // Documentos por área: cacheado aparte porque es la consulta más pesada
        $porArea = Cache::remember('dashboard_admin_por_area', 300, function () {
            return Area::query()
                ->withCount('documentos')
                ->having('documentos_count', '>', 0)
                ->orderByDesc('documentos_count')
                ->limit(7)
                ->get(['id_area', 'nombre'])
                ->map(fn (Area $a) => ['area' => $a->nombre, 'total' => $a->documentos_count])
                ->values()
                ->toArray();
        });

        $alertasRaw = $stats['alertasRaw'];
        $alertasPorNivel = [
            ['nivel' => 'Media',     'total' => (int) ($alertasRaw['media']     ?? 0), 'fill' => 'hsl(38 92% 50%)'],
            ['nivel' => 'Alta',      'total' => (int) ($alertasRaw['alta']      ?? 0), 'fill' => 'hsl(0 84% 60%)'],
            ['nivel' => 'Bloqueado', 'total' => (int) ($alertasRaw['bloqueado'] ?? 0), 'fill' => 'hsl(220 10% 55%)'],
        ];

        // Lista de usuarios pendientes: sin cache, el admin necesita verlos en tiempo real
        $usuariosPendientes = User::query()
            ->where('estado', 'pendiente')
            ->with('area:id_area,nombre')
            ->orderBy('created_at')
            ->limit(8)
            ->get(['id_user', 'nombre', 'apellido', 'email', 'area_id', 'created_at']);

        return [
            'stats' => [
                'usuariosActivos'      => $stats['usuariosActivos'],
                'pendientesAprobacion' => $stats['pendientesAprobacion'],
                'totalDocumentos'      => $stats['totalDocumentos'],
                'alertasActivas'       => $stats['alertasActivas'],
            ],
            'porMes'             => $porMes,
            'porArea'            => $porArea,
            'alertasPorNivel'    => $alertasPorNivel,
            'usuariosPendientes' => $usuariosPendientes,
        ];
    }

    // ── User ──────────────────────────────────────────────────────────────────

    private function userDashboardData(User $user, int $meses = 6): array
    {
        $userId = $user->id_user;
        $areaId = $user->area_id;

        // Stats cacheados por usuario — 5 minutos
        $stats = Cache::remember("dashboard_user_{$userId}_stats", 300, function () use ($userId, $areaId) {
            $porEstadoRaw = Documento::query()
                ->where('user_id', $userId)
                ->selectRaw('recibido, COUNT(*) as total')
                ->groupBy('recibido')
                ->pluck('total', 'recibido')
                ->toArray();

            $porTipoRaw = Documento::query()
                ->where('user_id', $userId)
                ->selectRaw('tipo, COUNT(*) as total')
                ->groupBy('tipo')
                ->pluck('total', 'tipo')
                ->toArray();

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
                'porEstadoRaw'         => $porEstadoRaw,
                'totalDocumentos'      => array_sum($porEstadoRaw),
                'pendientes'           => $pendientes,
                'movimientosPendientes'=> $movimientosPendientes,
                'respondidos'          => $porEstadoRaw['respondido'] ?? 0,
                'porTipoRaw'           => $porTipoRaw,
            ];
        });

        $porMes = $this->buildPorMesUsuario($userId, $meses);

        $estadoMeta = [
            'recibido'    => ['label' => 'Recibido',    'color' => 'hsl(220 90% 56%)'],
            'enviado'     => ['label' => 'Enviado',     'color' => 'hsl(187 85% 43%)'],
            'en_revision' => ['label' => 'En revisión', 'color' => 'hsl(38 92% 50%)'],
            'aprobado'    => ['label' => 'Aprobado',    'color' => 'hsl(142 71% 45%)'],
            'rechazado'   => ['label' => 'Rechazado',   'color' => 'hsl(0 84% 60%)'],
            'respondido'  => ['label' => 'Respondido',  'color' => 'hsl(262 80% 58%)'],
        ];

        $porEstado = array_values(array_map(
            fn ($key, $meta) => [
                'estado' => $meta['label'],
                'total'  => $stats['porEstadoRaw'][$key] ?? 0,
                'fill'   => $meta['color'],
            ],
            array_keys($estadoMeta),
            $estadoMeta,
        ));

        $porTipo = [
            ['tipo' => 'Interno', 'total' => $stats['porTipoRaw']['interno'] ?? 0, 'fill' => 'hsl(220 90% 56%)'],
            ['tipo' => 'Externo', 'total' => $stats['porTipoRaw']['externo'] ?? 0, 'fill' => 'hsl(187 85% 43%)'],
        ];

        // Últimos documentos: sin cache, deben estar siempre frescos
        $ultimosDocumentos = Documento::query()
            ->where('user_id', $userId)
            ->with([
                'remitente:id_remitente,nombre',
                'area:id_area,nombre',
            ])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id_documento', 'numero_oficio', 'asunto', 'tipo', 'recibido', 'fecha_oficio', 'remitente_id', 'area_actual_id', 'created_at']);

        return [
            'stats' => [
                'totalDocumentos'       => $stats['totalDocumentos'],
                'pendientes'            => $stats['pendientes'],
                'movimientosPendientes' => $stats['movimientosPendientes'],
                'respondidos'           => $stats['respondidos'],
            ],
            'porEstado'          => $porEstado,
            'porTipo'            => $porTipo,
            'porMes'             => $porMes,
            'mesesSeleccionados' => $meses,
            'ultimosDocumentos'  => $ultimosDocumentos,
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildPorMesUsuario(int $userId, int $meses): array
    {
        if ($meses === 1) {
            $raw = Cache::remember("dashboard_user_{$userId}_por_mes_1", 300, function () use ($userId) {
                return Documento::query()
                    ->where('user_id', $userId)
                    ->where('created_at', '>=', now()->subDays(29)->startOfDay())
                    ->selectRaw("DATE(created_at) as period, COUNT(*) as total")
                    ->groupByRaw("DATE(created_at)")
                    ->pluck('total', 'period')
                    ->toArray();
            });

            $base   = now();
            $result = [];
            for ($i = 29; $i >= 0; $i--) {
                $fecha    = $base->copy()->subDays($i);
                $result[] = ['mes' => $fecha->format('d M'), 'total' => (int) ($raw[$fecha->toDateString()] ?? 0)];
            }
            return $result;
        }

        if ($meses === 3) {
            $raw = Cache::remember("dashboard_user_{$userId}_por_mes_3", 300, function () use ($userId) {
                return Documento::query()
                    ->where('user_id', $userId)
                    ->where('created_at', '>=', now()->startOfWeek()->subWeeks(11))
                    ->selectRaw("DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)) as period, COUNT(*) as total")
                    ->groupByRaw("DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY))")
                    ->pluck('total', 'period')
                    ->toArray();
            });

            $baseWeek = now()->startOfWeek();
            $result   = [];
            for ($i = 11; $i >= 0; $i--) {
                $fecha    = $baseWeek->copy()->subWeeks($i);
                $result[] = ['mes' => $fecha->format('d M'), 'total' => (int) ($raw[$fecha->toDateString()] ?? 0)];
            }
            return $result;
        }

        $labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $raw    = Cache::remember("dashboard_user_{$userId}_por_mes_6", 300, function () use ($userId) {
            return Documento::query()
                ->where('user_id', $userId)
                ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
                ->selectRaw("CONCAT(YEAR(created_at), '-', MONTH(created_at)) as period, COUNT(*) as total")
                ->groupByRaw("CONCAT(YEAR(created_at), '-', MONTH(created_at))")
                ->pluck('total', 'period')
                ->toArray();
        });

        $base   = now();
        $result = [];
        for ($i = 5; $i >= 0; $i--) {
            $fecha    = $base->copy()->subMonths($i);
            $key      = $fecha->year . '-' . $fecha->month;
            $result[] = ['mes' => $labels[$fecha->month - 1], 'total' => (int) ($raw[$key] ?? 0)];
        }
        return $result;
    }
}
