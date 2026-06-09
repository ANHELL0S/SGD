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

/**
 * Gestiona el ciclo de vida de los expedientes: listado, detalle, apertura/cierre,
 * cambio de prioridad, exportación y estadísticas.
 *
 * Los usuarios solo acceden a expedientes de su área; los administradores tienen acceso global.
 */
class ExpedienteController extends Controller
{
    /**
     * Lista los expedientes con filtros opcionales de estado, prioridad y búsqueda de texto,
     * junto con estadísticas de conteo por estado.
     *
     * @param  Request $request Filtros opcionales: `estado`, `prioridad`, `search`.
     * @return Response
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
     * Muestra el detalle de un expediente con sus movimientos paginados y relaciones cargadas.
     *
     * Solo el admin o usuarios del área creadora pueden acceder.
     *
     * @param  Request    $request
     * @param  Expediente $expediente Expediente a visualizar (route model binding).
     * @return Response
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
     * Cierra un expediente, bloqueando el envío y respuesta de nuevos movimientos.
     *
     * Solo el admin o el área creadora pueden cerrarlo. Registra el evento en el log.
     *
     * @param  Request    $request
     * @param  Expediente $expediente Expediente a cerrar (route model binding).
     * @return RedirectResponse
     */
    public function cerrar(Request $request, Expediente $expediente): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        abort_unless(
            $user->rol === 'admin' || $expediente->area_creadora_id === $user->area_id,
            403
        );

        if ($expediente->estado === 'cerrado') {
            return back()->with('warning', 'El expediente ya estaba cerrado.');
        }

        $validated = $request->validate([
            'motivo' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'motivo.required' => 'Debes ingresar un motivo para cerrar la conversación.',
            'motivo.min'      => 'El motivo debe tener al menos 5 caracteres.',
            'motivo.max'      => 'El motivo no puede superar los 500 caracteres.',
        ]);

        try {
            DB::transaction(function () use ($expediente, $user, $validated): void {
                $expediente->update([
                    'estado'              => 'cerrado',
                    'motivo_cierre'       => $validated['motivo'],
                    'cerrado_por_user_id' => $user->id_user,
                    'cerrado_at'          => now(),
                ]);

                Log::channel('movimientos')->info('Expediente cerrado manualmente', [
                    'expediente_id'       => $expediente->id_expediente,
                    'codigo_expediente'   => $expediente->codigo_expediente,
                    'cerrado_por_user_id' => $user->id_user,
                    'cerrado_por_area_id' => $user->area_id,
                    'motivo'              => $validated['motivo'],
                ]);
            });
        } catch (\Throwable $e) {
            Log::channel('errores')->error('Error al cerrar expediente', [
                'expediente_id' => $expediente->id_expediente,
                'exception'     => $e->getMessage(),
            ]);

            return back()->withErrors(['motivo' => 'Ocurrió un error al cerrar la conversación. Intenta de nuevo.']);
        }

        return redirect()->to(route('user.movimientos.index', ['tab' => 'cerrados']))
            ->with('success', 'La conversación se cerró correctamente. Ya no se podrán enviar ni responder movimientos.');
    }

    /**
     * Reabre un expediente previamente cerrado, permitiendo nuevos movimientos.
     *
     * Solo el admin o el área creadora pueden abrirlo. Registra el evento en el log.
     *
     * @param  Request    $request
     * @param  Expediente $expediente Expediente a abrir (route model binding).
     * @return RedirectResponse
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

        return redirect()->to(route('user.movimientos.index', ['tab' => 'cerrados']))
            ->with('success', 'El expediente se abrió nuevamente. Ya se pueden enviar y responder movimientos.');
    }

    /**
     * Actualiza la prioridad del expediente (baja / media / alta).
     *
     * Solo el admin o el área creadora pueden modificarla. Registra el cambio en el log.
     *
     * @param  Request    $request    Debe contener `prioridad` ∈ {baja, media, alta}.
     * @param  Expediente $expediente Expediente a modificar (route model binding).
     * @return RedirectResponse
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
     * Exporta el resumen del expediente con todos sus movimientos en formato JSON.
     *
     * Pendiente de implementación: podrá adaptarse a PDF o Excel según necesidad.
     * Solo el admin o el área creadora pueden exportar.
     *
     * @param  Request    $request
     * @param  Expediente $expediente Expediente a exportar (route model binding).
     * @return \Illuminate\Http\JsonResponse
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
     * Devuelve estadísticas de expedientes del usuario (o globales si es admin):
     * total, abiertos, cerrados, por prioridad y creados en los últimos 30 días.
     *
     * @param  Request $request
     * @return \Illuminate\Http\JsonResponse
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


