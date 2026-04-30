<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LogSistema;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonitoreoController extends Controller
{
    /**
     * Mostrar listado de logs con filtros
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
     * Mostrar detalles de un log específico
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
