<?php

namespace App\Http\Controllers\Consultor;

use App\Http\Controllers\Controller;
use App\Models\AlertaMovimiento;
use App\Models\Documento;
use App\Models\Expediente;
use App\Models\Movimiento;
use App\Models\User;
use App\Notifications\RecordatorioMovimientoNotification;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Controla la vista principal del consultor: listado de expedientes con sus movimientos.
 *
 * Permite filtrar por pestaña (activos, cerrados, vencidos), enviar recordatorios
 * a los responsables de movimientos sin respuesta y calcular días laborales transcurridos.
 */
class ConsultorController extends Controller
{
    /**
     * Lista los expedientes paginados según la pestaña seleccionada, con conteos
     * de movimientos pendientes y vencidos, y un resumen global para el header.
     *
     * Un movimiento se considera vencido cuando no tiene respuesta generada
     * y su `fecha_envio` supera los 14 días calendario (≈ 10 laborales).
     *
     * @param  Request $request Parámetros opcionales: `per_page`, `page`, `tab`.
     * @return Response
     */
    public function index(Request $request): Response
    {
        $perPage   = min(max((int) $request->input('per_page', 5), 1), 20);
        $page      = max((int) $request->input('page', 1), 1);
        $tabInput  = $request->input('tab', 'activos');
        $tab       = in_array($tabInput, ['activos', 'cerrados', 'vencidos']) ? $tabInput : 'activos';
        $vencidoAt = Carbon::now()->subDays(14); // ≈ 10 días laborales

        $vencidoCondicion = fn ($q) => $q
            ->whereDoesntHave('documentosGenerados')
            ->where('fecha_envio', '<', $vencidoAt);

        // Conteos rápidos para el resumen (sin cargar datos)
        $totalExpedientes = Expediente::count();
        $totalVencidos    = Expediente::where('estado', 'abierto')
            ->whereHas('movimientos', $vencidoCondicion)->count();
        $totalActivos     = Expediente::where('estado', 'abierto')
            ->whereDoesntHave('movimientos', $vencidoCondicion)->count();
        $totalCerrados    = Expediente::where('estado', 'cerrado')->count();
        $totalMovimientos = Movimiento::count();

        // Query principal: parte de Expediente para mostrar TODOS
        $query = Expediente::query()
            ->withCount([
                'movimientos as pendientes_count' => fn ($q) =>
                    $q->whereDoesntHave('documentosGenerados')
                      ->where('fecha_envio', '>=', $vencidoAt),
                'movimientos as vencidos_count' => fn ($q) =>
                    $q->whereDoesntHave('documentosGenerados')
                      ->where('fecha_envio', '<', $vencidoAt),
                'movimientos as total_movimientos_count',
            ])
            ->with([
                'movimientos' => fn ($q) => $q
                    ->with([
                        'documento:id_documento,numero_oficio,asunto,palabra_clave,tipo,recibido,movimiento_origen_id',
                        'documento.movimientoOrigen:id_movimiento,documento_id,comentario,fecha_envio',
                        'documento.movimientoOrigen.documento:id_documento,numero_oficio,asunto',
                        'deArea:id_area,nombre',
                        'aArea:id_area,nombre',
                        'remitente:id_user,nombre,apellido,area_id',
                        'remitente.area:id_area,nombre',
                        'destinatario:id_user,nombre,apellido',
                        'documentosGenerados:id_documento,movimiento_origen_id',
                    ])
                    ->orderByDesc('fecha_envio')
                    ->orderByDesc('id_movimiento'),
            ])
            ->orderByDesc('updated_at')
            ->orderByDesc('id_expediente');

        // Filtro por pestaña
        if ($tab === 'cerrados') {
            $query->where('estado', 'cerrado');
        } elseif ($tab === 'vencidos') {
            $query->where('estado', 'abierto')
                  ->whereHas('movimientos', $vencidoCondicion);
        } else {
            $query->where('estado', 'abierto')
                  ->whereDoesntHave('movimientos', $vencidoCondicion);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page)->withQueryString();

        $expedientesData = $paginator->getCollection()->map(function (Expediente $exp): array {
            $movimientos      = $exp->movimientos;
            $movimientosVista = $movimientos->take(2)
                ->map(fn (Movimiento $m) => $this->formatMovimientoData($m))
                ->values();

            return [
                'expediente_id'           => $exp->id_expediente,
                'codigo_expediente'       => $exp->codigo_expediente,
                'asunto_resumen'          => $exp->asunto_resumen ?? 'Sin asunto',
                'estado'                  => $exp->estado,
                'prioridad'               => $exp->prioridad,
                'pendientes'              => (int) $exp->pendientes_count,
                'vencidos'                => (int) $exp->vencidos_count,
                'total_movimientos'       => $movimientos->count(),
                'ultima_fecha_envio'      => $movimientos->first()?->fecha_envio,
                'movimientos'             => $movimientosVista,
                'has_more'                => $movimientos->count() > 2,
                'total_movimientos_count' => (int) $exp->total_movimientos_count,
            ];
        })->values();

        $paginator->setCollection($expedientesData);

        return Inertia::render('consultor/index', [
            'expedientes' => $paginator,
            'tab'         => $tab,
            'resumen'     => [
                'total_expedientes'    => $totalExpedientes,
                'total_movimientos'    => $totalMovimientos,
                'expedientes_activos'  => $totalActivos,
                'expedientes_cerrados' => $totalCerrados,
                'expedientes_vencidos' => $totalVencidos,
                'total_vencidos'       => $totalVencidos,
            ],
        ]);
    }

    /**
     * Envía un recordatorio por notificación al responsable de responder un movimiento.
     *
     * Aplica un cooldown de 3 horas entre recordatorios del mismo movimiento.
     * Si el movimiento tiene destinatario específico notifica solo a ese usuario;
     * de lo contrario notifica a todos los usuarios activos del área destino.
     * Crea un registro en {@see AlertaMovimiento} por cada destinatario notificado.
     *
     * @param  Request    $request    Petición HTTP con el usuario consultor autenticado.
     * @param  Movimiento $movimiento Movimiento al que se le envía el recordatorio (route model binding).
     * @return RedirectResponse
     */
    public function recordar(Request $request, Movimiento $movimiento): RedirectResponse
    {
        $consultor = $request->user();
        abort_unless($consultor !== null, 403);

        // Verificar cooldown de 3 horas entre recordatorios
        if ($movimiento->ultimo_recordatorio_at?->addHours(3)->isFuture()) {
            $disponible = $movimiento->ultimo_recordatorio_at->addHours(3)->format('H:i');
            return back()->with('error', "Ya se envió un recordatorio recientemente. Podrás enviar otro a las {$disponible}.");
        }

        // Verificar que el movimiento no tenga respuesta ya generada
        $movimiento->loadMissing('documentosGenerados');
        if ($movimiento->documentosGenerados->isNotEmpty()) {
            return back()->with('error', 'Este movimiento ya tiene una respuesta generada.');
        }

        $movimiento->loadMissing([
            'documento:id_documento,numero_oficio,asunto,tipo',
            'deArea:id_area,nombre',
            'aArea:id_area,nombre',
        ]);

        $documento = $movimiento->documento
            ? Documento::find($movimiento->documento_id)
            : null;

        if ($documento === null) {
            return back()->with('error', 'No se encontró el documento asociado.');
        }

        // Destinatarios: el usuario específico o todos los activos del área
        if ($movimiento->destinatario_user_id !== null) {
            $usuarios = User::query()
                ->where('id_user', $movimiento->destinatario_user_id)
                ->whereNotNull('email')
                ->get(['id_user', 'nombre', 'apellido', 'email']);
        } else {
            $usuarios = User::query()
                ->where('area_id', $movimiento->a_area_id)
                ->where('estado', 'aprobado')
                ->where('habilitado', true)
                ->whereNotNull('email')
                ->get(['id_user', 'nombre', 'apellido', 'email']);
        }

        if ($usuarios->isEmpty()) {
            return back()->with('error', 'No se encontraron destinatarios con correo registrado.');
        }

        $asunto = ($documento->asunto !== null && trim($documento->asunto) !== '')
            ? $documento->asunto
            : ($documento->numero_oficio ?? 'Sin asunto');

        try {
            foreach ($usuarios as $usuario) {
                $usuario->notify(new RecordatorioMovimientoNotification($documento, $movimiento, $consultor));

                AlertaMovimiento::create([
                    'user_id'       => $usuario->id_user,
                    'movimiento_id' => $movimiento->id_movimiento,
                    'nivel'         => 'recordatorio',
                    'asunto'        => $asunto,
                ]);
            }
        } catch (Throwable $e) {
            Log::channel('errores')->warning('No se pudo enviar recordatorio de movimiento', [
                'movimiento_id'  => $movimiento->id_movimiento,
                'consultor_id'   => $consultor->id_user,
                'exception'      => $e->getMessage(),
            ]);

            return back()->with('error', 'Hubo un problema al enviar el recordatorio.');
        }

        $movimiento->update(['ultimo_recordatorio_at' => now()]);

        Log::channel('movimientos')->info('Recordatorio enviado por consultor', [
            'movimiento_id'      => $movimiento->id_movimiento,
            'documento_id'       => $documento->id_documento,
            'consultor_id'       => $consultor->id_user,
            'destinatarios'      => $usuarios->pluck('id_user')->toArray(),
        ]);

        return back()->with('success', 'Recordatorio enviado correctamente.');
    }

    /**
     * Transforma un movimiento en el array plano que consume la vista del consultor.
     *
     * Calcula si está vencido, los días laborales transcurridos y si puede enviarse
     * otro recordatorio según el cooldown de 3 horas.
     *
     * @param  Movimiento $m Movimiento con sus relaciones ya cargadas.
     * @return array<string, mixed>
     */
    private function formatMovimientoData(Movimiento $m): array
    {
        $respuestaEnviada = $m->documentosGenerados->isNotEmpty();
        $diasLaborales    = $m->fecha_envio
            ? $this->calcularDiasLaborales(Carbon::parse($m->fecha_envio), Carbon::now())
            : 0;
        $vencido = !$respuestaEnviada && $diasLaborales > 10;

        return [
            'id_movimiento'      => $m->id_movimiento,
            'documento'          => [
                'id_documento'         => $m->documento?->id_documento,
                'numero_oficio'        => $m->documento?->numero_oficio,
                'asunto'               => $m->documento?->asunto,
                'palabra_clave'        => $m->documento?->palabra_clave,
                'tipo'                 => $m->documento?->tipo,
                'recibido'             => $m->documento?->recibido,
                'movimiento_origen_id' => $m->documento?->movimiento_origen_id,
                'movimiento_origen'    => $m->documento?->movimientoOrigen ? [
                    'id_movimiento' => $m->documento->movimientoOrigen->id_movimiento,
                    'comentario'    => $m->documento->movimientoOrigen->comentario,
                    'documento'     => [
                        'id_documento'  => $m->documento->movimientoOrigen->documento?->id_documento,
                        'numero_oficio' => $m->documento->movimientoOrigen->documento?->numero_oficio,
                        'asunto'        => $m->documento->movimientoOrigen->documento?->asunto,
                    ],
                ] : null,
            ],
            'de_area'            => ['nombre' => $m->deArea?->nombre],
            'a_area'             => ['nombre' => $m->aArea?->nombre],
            'remitente'          => [
                'nombre'   => $m->remitente?->nombre,
                'apellido' => $m->remitente?->apellido,
                'area'     => ['nombre' => $m->remitente?->area?->nombre],
            ],
            'destinatario'       => [
                'nombre'   => $m->destinatario?->nombre,
                'apellido' => $m->destinatario?->apellido,
            ],
            'comentario'         => $m->comentario,
            'fecha_envio'        => $m->fecha_envio,
            'fecha_recepcion'    => $m->fecha_recepcion,
            'estado'             => $m->fecha_recepcion === null ? 'pendiente' : 'recibido',
            'respuesta_enviada'           => $respuestaEnviada,
            'vencido'                     => $vencido,
            'dias_transcurridos'          => $diasLaborales,
            'recordatorio_disponible_at'  => $m->ultimo_recordatorio_at?->addHours(3)->isFuture()
                ? $m->ultimo_recordatorio_at->addHours(3)->toISOString()
                : null,
            'puede_recordar'              => !$respuestaEnviada && !$vencido && $diasLaborales > 3
                && !($m->ultimo_recordatorio_at?->addHours(3)->isFuture()),
        ];
    }

    /**
     * Cuenta los días laborales (lunes a viernes) entre dos fechas, sin incluir el día inicial.
     *
     * @param  Carbon|\DateTimeInterface|string $inicio Fecha de inicio.
     * @param  Carbon|\DateTimeInterface|string $fin    Fecha de fin.
     * @return int Número de días laborales transcurridos.
     */
    private function calcularDiasLaborales($inicio, $fin): int
    {
        // Asegurar que ambos son objetos Carbon normales
        if (!$inicio instanceof Carbon) {
            $inicio = Carbon::parse($inicio);
        }
        if (!$fin instanceof Carbon) {
            $fin = Carbon::parse($fin);
        }

        $dias    = 0;
        $current = $inicio->copy()->addDay()->startOfDay();
        $end     = $fin->copy()->startOfDay();

        while ($current->lte($end)) {
            if ($current->isWeekday()) {
                $dias++;
            }
            $current->addDay();
        }

        return $dias;
    }
}
