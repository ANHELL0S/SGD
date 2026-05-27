<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LogSistema;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Expone la vista de monitoreo del sistema para el administrador.
 *
 * Permite filtrar y paginar los registros de {@see LogSistema} por tipo,
 * fecha y usuario, y ver el detalle de cada entrada individual.
 */
class MonitoreoController extends Controller
{
    /**
     * Lista los logs del sistema con filtros opcionales y paginación.
     *
     * @param  Request $request Filtros opcionales: `tipo`, `fecha`, `usuario_id`, `per_page`.
     * @return Response
     */
    public function index(Request $request): Response
    {
        $query = LogSistema::query()->with('user');

        // Filtro por tipo
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        // Filtro por fecha
        if ($request->filled('fecha')) {
            $query->whereDate('created_at', $request->input('fecha'));
        }

        // Filtro por usuario
        if ($request->filled('usuario_id')) {
            $query->where('user_id', (int) $request->input('usuario_id'));
        }

        // Paginación
        $perPage = (int) $request->integer('per_page', 5);

        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        $logs = $query
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        // Obtener tipos únicos para el select
        $tipos = LogSistema::query()->distinct()
            ->pluck('tipo')
            ->sort()
            ->values()
            ->all();

        return Inertia::render('admin/monitoreo/index', [
            'logs' => $logs,
            'filters' => [
                'tipo' => $request->input('tipo', ''),
                'fecha' => $request->input('fecha', ''),
                'usuario_id' => $request->filled('usuario_id')
                    ? (string) ((int) $request->input('usuario_id'))
                    : '',
                'per_page' => (string) $perPage,
            ],
            'tipos' => $tipos,
        ]);
    }

    /**
     * Muestra el detalle completo de un registro de log, incluyendo el usuario relacionado.
     *
     * @param  LogSistema $log Entrada del log (route model binding).
     * @return Response
     */
    public function show(LogSistema $log): Response
    {
        // Cargar la relación del usuario
        $log->load('user');

        return Inertia::render('admin/monitoreo/show', [
            'log' => $log,
        ]);
    }
}
