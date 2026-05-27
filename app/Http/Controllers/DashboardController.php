<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\DashboardQueryService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Controla la vista principal del dashboard según el rol del usuario autenticado.
 *
 * Redirige a consultores, construye datos para admin y para usuarios normales,
 * y delega todas las consultas a {@see DashboardQueryService}.
 */
class DashboardController extends Controller
{
    /**
     * @param DashboardQueryService $queries Servicio centralizado de consultas del dashboard.
     */
    public function __construct(private DashboardQueryService $queries) {}

    /**
     * Muestra el dashboard correspondiente al rol del usuario autenticado.
     *
     * - Consultor → redirige a su vista de expedientes.
     * - Admin     → renderiza `admin/dashboard` con estadísticas globales.
     * - Usuario   → renderiza `user/dashboard` con estadísticas propias.
     *
     * @param  Request                $request Petición HTTP con el parámetro opcional `periodo`.
     * @return Response|RedirectResponse
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user?->rol === 'consultor') {
            return redirect()->route('consultor.expedientes.index');
        }

        $periodo = $request->string('periodo', 'todos')->toString();
        if (! in_array($periodo, ['semana', 'mes', 'año', 'todos'], true)) {
            $periodo = 'todos';
        }

        if ($user?->rol === 'admin') {
            return Inertia::render('admin/dashboard', $this->adminDashboardData($periodo));
        }

        return Inertia::render('user/dashboard', $this->userDashboardData($user, $periodo));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * Recopila todos los datos necesarios para el dashboard de administrador.
     *
     * @param  string $periodo Período seleccionado ('semana', 'mes', 'año', 'todos').
     * @return array<string, mixed> Props que se pasan a la vista Inertia.
     */
    private function adminDashboardData(string $periodo): array
    {
        [$desde, $hasta] = $periodo === 'todos' ? [null, null] : $this->resolveRango($periodo);

        $stats      = $this->queries->adminStats();
        $porMesRaw  = $this->queries->porMesPeriodo($periodo, $desde, $hasta);
        $porArea    = $this->queries->adminPorAreaPeriodo($desde, $hasta);
        $alertasRaw = $stats['alertasRaw'];

        return [
            'stats' => [
                'usuariosActivos'      => $stats['usuariosActivos'],
                'pendientesAprobacion' => $stats['pendientesAprobacion'],
                'totalDocumentos'      => $this->queries->totalDocumentosPeriodo($desde, $hasta),
                'alertasActivas'       => $stats['alertasActivas'],
            ],
            'porMes'             => $this->buildChartData($porMesRaw, $periodo, $desde, $hasta),
            'porArea'            => $porArea,
            'alertasPorNivel'    => [
                ['nivel' => 'Media',     'total' => (int) ($alertasRaw['media']     ?? 0), 'fill' => 'hsl(38 92% 50%)'],
                ['nivel' => 'Alta',      'total' => (int) ($alertasRaw['alta']      ?? 0), 'fill' => 'hsl(0 84% 60%)'],
                ['nivel' => 'Bloqueado', 'total' => (int) ($alertasRaw['bloqueado'] ?? 0), 'fill' => 'hsl(220 10% 55%)'],
            ],
            'usuariosPendientes'  => $this->queries->adminUsuariosPendientes(),
            'periodoSeleccionado' => $periodo,
        ];
    }

    // ── User ──────────────────────────────────────────────────────────────────

    /**
     * Recopila todos los datos necesarios para el dashboard de un usuario normal.
     *
     * @param  User   $user    Usuario autenticado.
     * @param  string $periodo Período seleccionado ('semana', 'mes', 'año', 'todos').
     * @return array<string, mixed> Props que se pasan a la vista Inertia.
     */
    private function userDashboardData(User $user, string $periodo): array
    {
        $userId = $user->id_user;
        $areaId = $user->area_id;

        [$desde, $hasta] = $periodo === 'todos' ? [null, null] : $this->resolveRango($periodo);

        $stats      = $this->queries->userStats($userId, $areaId);
        $estadoTipo = $this->queries->userPorEstadoTipoPeriodo($userId, $desde, $hasta);
        $porMesRaw  = $this->queries->porMesPeriodo($periodo, $desde, $hasta, $userId);

        return [
            'stats' => [
                'totalDocumentos'       => $this->queries->totalDocumentosPeriodo($desde, $hasta, $userId),
                'pendientes'            => $stats['pendientes'],
                'movimientosPendientes' => $stats['movimientosPendientes'],
                'respondidos'           => $estadoTipo['porEstadoRaw']['respondido'] ?? 0,
            ],
            'porEstado'           => $this->buildPorEstado($estadoTipo['porEstadoRaw']),
            'porTipo'             => $this->buildPorTipo($estadoTipo['porTipoRaw']),
            'porMes'              => $this->buildChartData($porMesRaw, $periodo, $desde, $hasta),
            'periodoSeleccionado' => $periodo,
            'ultimosDocumentos'   => $this->queries->userUltimosDocumentos($userId),
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Devuelve el rango de fechas [desde, hasta] correspondiente al período dado.
     *
     * @param  string $periodo Uno de: 'hoy', 'semana', 'año' o cualquier otro valor (→ mes actual).
     * @return array{0: string, 1: string} Par [fecha_inicio, fecha_fin] en formato Y-m-d.
     */
    private function resolveRango(string $periodo): array
    {
        return match ($periodo) {
            'hoy'    => [now()->toDateString(), now()->toDateString()],
            'semana' => [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()],
            'año'    => [now()->startOfYear()->toDateString(), now()->endOfYear()->toDateString()],
            default  => [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()],
        };
    }

    /**
     * Transforma los datos crudos de consulta en la estructura que espera el gráfico de línea/barras.
     *
     * Cuando no hay rango definido ('todos') agrupa por mes; para 'año' genera un punto por
     * cada mes del año; para el resto genera un punto por día dentro del rango.
     *
     * @param  array<string, int|string> $raw    Mapa período → total proveniente del servicio.
     * @param  string                   $periodo Período seleccionado.
     * @param  string|null              $desde   Fecha de inicio en formato Y-m-d, o null.
     * @param  string|null              $hasta   Fecha de fin en formato Y-m-d, o null.
     * @return array<int, array{mes: string, total: int}>
     */
    private function buildChartData(array $raw, string $periodo, ?string $desde, ?string $hasta): array
    {
        $labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Si no hay rango definido (periodo 'todos'), agrupar por mes
        if ($desde === null || $hasta === null) {
            // $raw puede tener claves de tipo fecha (YYYY-MM-DD) o mes (YYYY-MM)
            $agrupado = [];
            foreach ($raw as $period => $total) {
                // Si la clave es YYYY-MM-DD, agrupar por YYYY-MM
                $mes = preg_match('/^\d{4}-\d{2}-\d{2}$/', $period)
                    ? substr($period, 0, 7)
                    : $period;
                $agrupado[$mes] = ($agrupado[$mes] ?? 0) + (int) $total;
            }
            // Ordenar por mes ascendente
            ksort($agrupado);
            return collect($agrupado)
                ->map(function ($total, $mes) use ($labels) {
                    $dt = \DateTimeImmutable::createFromFormat('Y-m', $mes);
                    $label = $dt ? $labels[$dt->format('n') - 1] . ' ' . $dt->format('Y') : $mes;
                    return ['mes' => $label, 'total' => (int) $total];
                })
                ->values()
                ->all();
        }

        if ($periodo === 'año') {
            return collect(range(0, 11))
                ->map(function ($i) use ($labels, $raw) {
                    $fecha = now()->startOfYear()->addMonths($i);
                    return ['mes' => $labels[$fecha->month - 1], 'total' => (int) ($raw[$fecha->format('Y-m')] ?? 0)];
                })
                ->all();
        }

        // hoy, semana, mes → un punto por día
        $result  = [];
        $current = CarbonImmutable::parse($desde);
        $fin     = CarbonImmutable::parse($hasta);
        while ($current->lte($fin)) {
            $result[] = [
                'mes'   => $current->format('d M'),
                'total' => (int) ($raw[$current->toDateString()] ?? 0),
            ];
            $current = $current->addDay();
        }
        return $result;
    }

    /**
     * Convierte el mapa crudo de estados en el formato que espera el gráfico de dona/barras.
     *
     * @param  array<string, int> $raw Mapa estado → total (e.g. ['recibido' => 5, 'enviado' => 2]).
     * @return array<int, array{estado: string, total: int, fill: string}>
     */
    private function buildPorEstado(array $raw): array
    {
        $meta = [
            'recibido'    => ['label' => 'Recibido',    'color' => 'hsl(220 90% 56%)'],
            'enviado'     => ['label' => 'Enviado',     'color' => 'hsl(187 85% 43%)'],
            'en_revision' => ['label' => 'En revisión', 'color' => 'hsl(38 92% 50%)'],
            'aprobado'    => ['label' => 'Aprobado',    'color' => 'hsl(142 71% 45%)'],
            'rechazado'   => ['label' => 'Rechazado',   'color' => 'hsl(0 84% 60%)'],
            'respondido'  => ['label' => 'Respondido',  'color' => 'hsl(262 80% 58%)'],
        ];

        $result = [];
        foreach ($meta as $key => $m) {
            $result[] = ['estado' => $m['label'], 'total' => $raw[$key] ?? 0, 'fill' => $m['color']];
        }
        return $result;
    }

    /**
     * Convierte el mapa crudo de tipos en el formato que espera el gráfico de dona/barras.
     *
     * @param  array<string, int> $raw Mapa tipo → total (e.g. ['interno' => 3, 'externo' => 7]).
     * @return array<int, array{tipo: string, total: int, fill: string}>
     */
    private function buildPorTipo(array $raw): array
    {
        return [
            ['tipo' => 'Interno', 'total' => $raw['interno'] ?? 0, 'fill' => 'hsl(220 90% 56%)'],
            ['tipo' => 'Externo', 'total' => $raw['externo'] ?? 0, 'fill' => 'hsl(187 85% 43%)'],
        ];
    }
}
