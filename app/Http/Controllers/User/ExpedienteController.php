<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Expediente;
use App\Models\Movimiento;
use App\Models\Documento;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ExpedienteController extends Controller
{
    /**
     * Lista de expedientes con filtros y paginación
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $query = Expediente::query()
            ->with(['areaCreadora:id_area,nombre']);

        // Filtro por estado
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        // Filtro por prioridad
        if ($request->filled('prioridad')) {
            $query->where('prioridad', $request->prioridad);
        }

        // Búsqueda por código o asunto
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('codigo_expediente', 'LIKE', "%{$search}%")
                    ->orWhere('asunto_resumen', 'LIKE', "%{$search}%");
            });
        }

        // Solo mostrar expedientes del área del usuario (si no es admin)
        if ($user->rol !== 'admin') {
            $query->where('area_creadora_id', $user->area_id);
        }

        $expedientes = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        // Estadísticas por estado
        $stats = [
            'total' => Expediente::when($user->rol !== 'admin', function ($q) use ($user) {
                $q->where('area_creadora_id', $user->area_id);
            })->count(),
            'abiertos' => Expediente::when($user->rol !== 'admin', function ($q) use ($user) {
                $q->where('area_creadora_id', $user->area_id);
            })->where('estado', 'abierto')->count(),
            'cerrados' => Expediente::when($user->rol !== 'admin', function ($q) use ($user) {
                $q->where('area_creadora_id', $user->area_id);
            })->where('estado', 'cerrado')->count(),
        ];

        return Inertia::render('user/expedientes/index', [
            'expedientes' => $expedientes,
            'filtros' => [
                'estado' => $request->estado,
                'prioridad' => $request->prioridad,
                'search' => $request->search,
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Mostrar detalle de un expediente con todos sus movimientos y documentos
     */
    public function show(Request $request, Expediente $expediente): Response
{
    $user = $request->user();
    abort_unless($user !== null, 403);

    abort_unless(
        $user->rol === 'admin' || $expediente->area_creadora_id === $user->area_id,
        403
    );

    $expediente->load(['areaCreadora:id_area,nombre']);

    // Obtener todos los movimientos del expediente
    $movimientos = Movimiento::where('expediente_id', $expediente->id_expediente)
        ->with([
            'documento:id_documento,numero_oficio,asunto,palabra_clave,tipo,recibido,archivo',
            'deArea:id_area,nombre',
            'aArea:id_area,nombre',
            'remitente:id_user,nombre,apellido',
            'destinatario:id_user,nombre,apellido',
        ])
        ->orderBy('fecha_envio', 'desc')
        ->paginate(15);

    return Inertia::render('user/expedientes/show', [
        'expediente' => $expediente,
        'movimientos' => $movimientos,
    ]);
}

    /**
     * Cerrar un expediente (no permite nuevos movimientos)
     */
    public function cerrar(Request $request, Expediente $expediente): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        // Solo admin o creador del expediente pueden cerrarlo
        abort_unless(
            $user->rol === 'admin' || $expediente->area_creadora_id === $user->area_id,
            403
        );

        if ($expediente->estado === 'cerrado') {
            return back()->with('warning', 'El expediente ya estaba cerrado.');
        }

        DB::transaction(function () use ($expediente, $user): void {
            $expediente->update([
                'estado' => 'cerrado',
            ]);

            Log::channel('movimientos')->info('Expediente cerrado manualmente', [
                'expediente_id' => $expediente->id_expediente,
                'codigo_expediente' => $expediente->codigo_expediente,
                'cerrado_por_user_id' => $user->id_user,
                'cerrado_por_area_id' => $user->area_id,
            ]);
        });

        return back()->with('success', 'El expediente se cerró correctamente. Ya no se podrán enviar ni responder movimientos.');
    }

    /**
     * Abrir un expediente cerrado (permite nuevos movimientos nuevamente)
     */
    public function abrir(Request $request, Expediente $expediente): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        // Solo admin o creador del expediente pueden abrirlo
        abort_unless(
            $user->rol === 'admin' || $expediente->area_creadora_id === $user->area_id,
            403
        );

        if ($expediente->estado === 'abierto') {
            return back()->with('warning', 'El expediente ya estaba abierto.');
        }

        DB::transaction(function () use ($expediente, $user): void {
            $expediente->update([
                'estado' => 'abierto',
            ]);

            Log::channel('movimientos')->info('Expediente abierto manualmente', [
                'expediente_id' => $expediente->id_expediente,
                'codigo_expediente' => $expediente->codigo_expediente,
                'abierto_por_user_id' => $user->id_user,
                'abierto_por_area_id' => $user->area_id,
            ]);
        });

        return back()->with('success', 'El expediente se abrió nuevamente. Ya se pueden enviar y responder movimientos.');
    }

    /**
     * Actualizar prioridad del expediente
     */
    public function actualizarPrioridad(Request $request, Expediente $expediente): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        // Solo admin o creador del expediente pueden cambiar prioridad
        abort_unless(
            $user->rol === 'admin' || $expediente->area_creadora_id === $user->area_id,
            403
        );

        $request->validate([
            'prioridad' => 'required|in:baja,media,alta',
        ]);

        $expediente->update([
            'prioridad' => $request->prioridad,
        ]);

        Log::channel('movimientos')->info('Prioridad de expediente actualizada', [
            'expediente_id' => $expediente->id_expediente,
            'codigo_expediente' => $expediente->codigo_expediente,
            'prioridad' => $request->prioridad,
            'actualizado_por_user_id' => $user->id_user,
        ]);

        return back()->with('success', 'La prioridad del expediente se actualizó correctamente.');
    }

    /**
     * Exportar resumen del expediente (opcional - para reportes)
     */
    public function exportar(Request $request, Expediente $expediente)
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        abort_unless(
            $user->rol === 'admin' || $expediente->area_creadora_id === $user->area_id,
            403
        );

        $expediente->load(['areaCreadora:id_area,nombre']);

        $movimientos = Movimiento::where('expediente_id', $expediente->id_expediente)
            ->with([
                'documento',
                'deArea:id_area,nombre',
                'aArea:id_area,nombre',
                'remitente:id_user,nombre,apellido',
            ])
            ->orderBy('fecha_envio', 'asc')
            ->get();

        // Aquí puedes implementar la exportación a PDF o Excel
        // Por ahora retornamos un JSON (puedes adaptarlo según necesites)
        return response()->json([
            'expediente' => $expediente,
            'movimientos' => $movimientos,
            'exportado_por' => $user->nombre . ' ' . $user->apellido,
            'fecha_exportacion' => now()->toDateTimeString(),
        ]);
    }

    /**
     * Obtener estadísticas generales de expedientes (para dashboard)
     */
    public function estadisticas(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $query = Expediente::query();

        if ($user->rol !== 'admin') {
            $query->where('area_creadora_id', $user->area_id);
        }

        $stats = [
            'total' => (clone $query)->count(),
            'abiertos' => (clone $query)->where('estado', 'abierto')->count(),
            'cerrados' => (clone $query)->where('estado', 'cerrado')->count(),
            'por_prioridad' => [
                'alta' => (clone $query)->where('prioridad', 'alta')->count(),
                'media' => (clone $query)->where('prioridad', 'media')->count(),
                'baja' => (clone $query)->where('prioridad', 'baja')->count(),
            ],
            'ultimos_30_dias' => (clone $query)->where('created_at', '>=', now()->subDays(30))->count(),
        ];

        return response()->json($stats);
    }
}


