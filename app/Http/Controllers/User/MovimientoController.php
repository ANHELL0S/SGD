<?php

namespace App\Http\Controllers\User;

use App\Events\DocumentoMovimientoActualizado;
use App\Http\Controllers\Controller;
use App\Models\Expediente;
use App\Http\Requests\User\StoreMovimientoRequest;
use App\Http\Requests\User\StoreRespuestaOficioRequest;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\Remitente;
use App\Models\User;
use App\Notifications\MovimientoDocumentoNotification;
use App\Services\DashboardQueryService;
use App\Services\OcrService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Gestiona el envío, recepción y respuesta de movimientos de documentos entre áreas.
 *
 * Agrupa los movimientos por expediente para la vista principal, aplica paginación
 * manual en tres pestañas independientes (activos / cerrados / vencidos), emite
 * eventos de broadcasting en tiempo real y envía notificaciones por correo.
 */
class MovimientoController extends Controller
{
    public function __construct(
        private readonly OcrService $ocrService,
        private readonly DashboardQueryService $dashboardQueries,
    ) {}

    /**
     * Lista los movimientos del usuario agrupados por expediente, separados en tres
     * colecciones paginadas: activos, cerrados y vencidos (con movimiento bloqueado).
     *
     * Soporta búsqueda independiente por pestaña sobre el asunto del expediente.
     *
     * @param  Request $request Parámetros opcionales: `per_page`, `activos_page`, `cerrados_page`,
     *                          `vencidos_page`, `busqueda_activos`, `busqueda_cerrados`, `busqueda_vencidos`, `tab`.
     * @return Response
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $perPage      = min(max((int) $request->input('per_page', 5), 1), 20);
        $activosPage  = max((int) $request->input('activos_page', 1), 1);
        $cerradosPage = max((int) $request->input('cerrados_page', 1), 1);
        $vencidosPage = max((int) $request->input('vencidos_page', 1), 1);
        $busquedaActivos  = trim((string) $request->input('busqueda_activos', ''));
        $busquedaCerrados = trim((string) $request->input('busqueda_cerrados', ''));
        $busquedaVencidos = trim((string) $request->input('busqueda_vencidos', ''));

        $esDestinatario = static function (Movimiento $movimiento) use ($user): bool {
            return $movimiento->destinatario_user_id === null
                || (int) $movimiento->destinatario_user_id === (int) $user->id_user;
        };

        $applyAreaScope = static function (Builder $query) use ($user): void {
            $query->where(function (Builder $nested) use ($user): void {
                $nested->where('de_area_id', $user->area_id)
                    ->orWhere(function (Builder $destino) use ($user): void {
                        $destino->where('a_area_id', $user->area_id)
                            ->where(function (Builder $destinatario) use ($user): void {
                                $destinatario->whereNull('destinatario_user_id')
                                    ->orWhere('destinatario_user_id', $user->id_user);
                            });
                    });
            });
        };

        $movimientos = Movimiento::query()
            ->with([
                'documento:id_documento,numero_oficio,asunto,palabra_clave,tipo,recibido,user_id,area_actual_id,area_creadora_id,documento_padre_id,movimiento_origen_id,hilo_id,expediente_id',
                'documento.documentoHilo:id_documento,numero_oficio,asunto,user_id,conversacion_cerrada_at',
                'documento.documentoPadre:id_documento,numero_oficio,asunto',
                'documento.expediente:id_expediente,codigo_expediente,estado,asunto_resumen',
                'documento.movimientoOrigen:id_movimiento,documento_id,de_area_id,a_area_id,comentario,fecha_envio',
                'documento.movimientoOrigen.documento:id_documento,numero_oficio,asunto',
                'documento.user:id_user,nombre,apellido,area_id',
                'documento.user.area:id_area,nombre',
                'deArea:id_area,nombre',
                'aArea:id_area,nombre',
                'remitente:id_user,nombre,apellido,area_id',
                'destinatario:id_user,nombre,apellido',
                'remitente.area:id_area,nombre',
                'expediente:id_expediente,codigo_expediente,estado,asunto_resumen,prioridad,fecha_inicio,area_creadora_id',
                'documentosGenerados:id_documento,movimiento_origen_id',
            ])
            ->where($applyAreaScope)
            ->orderByDesc('fecha_envio')
            ->orderByDesc('id_movimiento')
            ->get();

        $todosExpedientes = $movimientos
            ->groupBy(function (Movimiento $movimiento): string {
                return $movimiento->expediente_id ? 'exp:' . $movimiento->expediente_id : 'exp:0';
            })
            ->map(function ($grupo) use ($user, $esDestinatario) {
                $expediente          = $grupo->first()?->expediente;
                $expedienteId        = $grupo->first()?->expediente_id;
                $movimientosOrdenados = $grupo->sortByDesc('fecha_envio')->values();

                $tieneRespuesta   = $movimientosOrdenados->filter(fn(Movimiento $m): bool => $m->documento?->movimiento_origen_id !== null || $m->respuesta_comentario !== null)->isNotEmpty();
                $totalMovimientos = $movimientosOrdenados->count();
                $salidas          = $movimientosOrdenados->where('de_area_id', $user->area_id)->count();
                $entradas         = $movimientosOrdenados->filter(fn(Movimiento $m): bool =>
                    $m->a_area_id === $user->area_id &&
                    ($m->destinatario_user_id === null || (int) $m->destinatario_user_id === (int) $user->id_user)
                )->count();
                $pendientes = $movimientosOrdenados->filter(fn(Movimiento $m): bool =>
                    $m->a_area_id === $user->area_id &&
                    ($m->destinatario_user_id === null || (int) $m->destinatario_user_id === (int) $user->id_user)
                )->whereNull('fecha_recepcion')->count();

                $maxPorGrupo     = 2;
                $movimientosVista = $movimientosOrdenados->take($maxPorGrupo)->map(function (Movimiento $movimiento) use ($user, $esDestinatario): array {
                    $respuestaEnviada     = $movimiento->documentosGenerados->isNotEmpty() || $movimiento->respuesta_comentario !== null;
                    $esMovimientoEntrante = $movimiento->a_area_id === $user->area_id && $esDestinatario($movimiento);
                    $diasLaborales        = $movimiento->fecha_envio
                        ? $this->calcularDiasLaborales(\Carbon\Carbon::parse($movimiento->fecha_envio), now())
                        : 0;
                    $bloqueado = $esMovimientoEntrante && !$respuestaEnviada && $diasLaborales > 10;

                    return [
                        'id_movimiento' => $movimiento->id_movimiento,
                        'documento' => [
                            'id_documento'         => $movimiento->documento?->id_documento,
                            'numero_oficio'        => $movimiento->documento?->numero_oficio,
                            'asunto'               => $movimiento->documento?->asunto,
                            'palabra_clave'        => $movimiento->documento?->palabra_clave,
                            'tipo'                 => $movimiento->documento?->tipo,
                            'recibido'             => $movimiento->documento?->recibido,
                            'documento_padre_id'   => $movimiento->documento?->documento_padre_id,
                            'movimiento_origen_id' => $movimiento->documento?->movimiento_origen_id,
                            'hilo_id'              => $movimiento->documento?->hilo_id,
                            'conversacion_cerrada_at' => $movimiento->documento?->documentoHilo?->conversacion_cerrada_at,
                        ],
                        'de_area'     => ['nombre' => $movimiento->deArea?->nombre],
                        'a_area'      => ['nombre' => $movimiento->aArea?->nombre],
                        'remitente'   => [
                            'nombre'   => $movimiento->remitente?->nombre,
                            'apellido' => $movimiento->remitente?->apellido,
                            'area'     => ['nombre' => $movimiento->remitente?->area?->nombre],
                        ],
                        'destinatario'         => ['nombre' => $movimiento->destinatario?->nombre, 'apellido' => $movimiento->destinatario?->apellido],
                        'comentario'              => $movimiento->comentario,
                        'respuesta_comentario'    => $movimiento->respuesta_comentario,
                        'es_respuesta_comentario' => (bool) $movimiento->es_respuesta_comentario,
                        'fecha_envio'             => $movimiento->fecha_envio,
                        'fecha_recepcion'      => $movimiento->fecha_recepcion,
                        'direccion'            => $movimiento->de_area_id === $user->area_id ? 'salida' : 'entrada',
                        'estado'               => $movimiento->fecha_recepcion === null ? 'pendiente' : 'recibido',
                        'respuesta_enviada'    => $respuestaEnviada,
                        'puede_marcar_recibido' => $esMovimientoEntrante && $movimiento->fecha_recepcion === null,
                        'puede_responder'      => $esMovimientoEntrante && !$respuestaEnviada && !$bloqueado,
                        'dias_transcurridos'   => $diasLaborales,
                        'bloqueado'            => $bloqueado,
                        'es_copia'             => (bool) $movimiento->es_copia,
                    ];
                })->values();

                return [
                    'expediente_id'          => $expedienteId,
                    'codigo_expediente'      => $expediente?->codigo_expediente ?? 'SIN EXPEDIENTE',
                    'asunto_resumen'         => $expediente?->asunto_resumen ?? 'Documentos sin expediente asignado',
                    'estado'                 => $expediente?->estado ?? 'abierto',
                    'prioridad'              => $expediente?->prioridad ?? 'media',
                    'area_creadora_id'       => $expediente?->area_creadora_id,
                    'tiene_respuesta'        => $tieneRespuesta,
                    'total_movimientos'      => $totalMovimientos,
                    'salidas'                => $salidas,
                    'entradas'               => $entradas,
                    'pendientes'             => $pendientes,
                    'ultima_fecha_envio'     => $movimientosOrdenados->first()?->fecha_envio,
                    'movimientos'            => $movimientosVista,
                    'has_more'               => $totalMovimientos > $maxPorGrupo,
                    'total_movimientos_count' => $totalMovimientos,
                ];
            })
            ->sortByDesc('ultima_fecha_envio')
            ->values();

        // Separar en tres categorías independientes
        $activosCollection  = $todosExpedientes->filter(fn($e) => $e['estado'] === 'abierto' && !collect($e['movimientos'])->contains('bloqueado', true))->values();
        $vencidosCollection = $todosExpedientes->filter(fn($e) => $e['estado'] === 'abierto' && collect($e['movimientos'])->contains('bloqueado', true))->values();
        $cerradosCollection = $todosExpedientes->filter(fn($e) => $e['estado'] === 'cerrado')->values();

        // Aplicar búsqueda por pestaña de forma independiente
        $filtrarPorBusqueda = fn(\Illuminate\Support\Collection $col, string $term): \Illuminate\Support\Collection =>
            $col->filter(fn(array $e): bool => str_contains(mb_strtolower((string) ($e['asunto_resumen'] ?? '')), mb_strtolower($term)))->values();

        if ($busquedaActivos  !== '') $activosCollection  = $filtrarPorBusqueda($activosCollection, $busquedaActivos);
        if ($busquedaCerrados !== '') $cerradosCollection = $filtrarPorBusqueda($cerradosCollection, $busquedaCerrados);
        if ($busquedaVencidos !== '') $vencidosCollection = $filtrarPorBusqueda($vencidosCollection, $busquedaVencidos);

        $buildPaginator = function (\Illuminate\Support\Collection $col, int $page, string $pageParam) use ($perPage, $request, $busquedaActivos, $busquedaCerrados, $busquedaVencidos): \Illuminate\Pagination\LengthAwarePaginator {
            $extra = array_filter(
                array_merge($request->except([$pageParam]), [
                    'per_page'         => $perPage,
                    'busqueda_activos'  => $busquedaActivos  ?: null,
                    'busqueda_cerrados' => $busquedaCerrados ?: null,
                    'busqueda_vencidos' => $busquedaVencidos ?: null,
                ]),
                fn($v): bool => $v !== null && $v !== '',
            );

            return (new \Illuminate\Pagination\LengthAwarePaginator(
                $col->slice(($page - 1) * $perPage, $perPage)->values(),
                $col->count(),
                $perPage,
                $page,
                ['path' => $request->url(), 'pageName' => $pageParam],
            ))->appends($extra);
        };

        return Inertia::render('user/movimientos/index', [
            'expedientesActivos'  => $buildPaginator($activosCollection, $activosPage, 'activos_page'),
            'expedientesCerrados' => $buildPaginator($cerradosCollection, $cerradosPage, 'cerrados_page'),
            'expedientesVencidos' => $buildPaginator($vencidosCollection, $vencidosPage, 'vencidos_page'),
            'filters'  => [
                'busqueda_activos'  => $busquedaActivos,
                'busqueda_cerrados' => $busquedaCerrados,
                'busqueda_vencidos' => $busquedaVencidos,
                'per_page'          => (string) $perPage,
                'tab'               => $request->input('tab', ''),
            ],
            'resumen'  => [
                'total_movimientos'     => $movimientos->count(),
                'expedientes_activos'   => $activosCollection->count(),
                'expedientes_cerrados'  => $cerradosCollection->count(),
                'expedientes_vencidos'  => $vencidosCollection->count(),
            ],
        ]);
    }

    /**
     * Envía un documento a otra área, creando un expediente automáticamente si el documento
     * no tiene uno asignado. Bloquea el envío si el expediente está cerrado o hay
     * una recepción pendiente en el área actual.
     *
     * Dentro de una transacción: crea el movimiento, actualiza el área actual del documento
     * y emite el evento de broadcasting + notificación por correo a los destinatarios.
     *
     * @param  StoreMovimientoRequest $request Datos validados: `id_documento`, `a_area_id`,
     *                                         `destinatario_user_id` (opcional), `comentario`.
     * @return RedirectResponse
     */
    public function store(StoreMovimientoRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $documento = Documento::query()->findOrFail($request->integer('id_documento'));

        // Validar que el expediente no esté cerrado
        if ($documento->expediente_id) {
            $expediente = Expediente::find($documento->expediente_id);
            if ($expediente && $expediente->estado === 'cerrado') {
                return back()->withErrors([
                    'id_documento' => 'No se puede enviar el documento porque el expediente está cerrado.',
                ]);
            }
        }

        $deAreaId = $user->rol === 'admin'
            ? $documento->area_actual_id
            : $user->area_id;
        $aAreaId = $request->integer('a_area_id');
        $destinatarioUserId = $request->filled('destinatario_user_id')
            ? $request->integer('destinatario_user_id')
            : null;

        abort_unless(
            $user->rol === 'admin' || $documento->area_actual_id === $user->area_id,
            403,
        );

        if ($deAreaId === $aAreaId) {
            return back()->withErrors([
                'a_area_id' => 'El área destino debe ser diferente al área actual del oficio.',
            ]);
        }

        $tieneRecepcionPendiente = Movimiento::query()
            ->where('documento_id', $documento->id_documento)
            ->where('a_area_id', $deAreaId)
            ->whereNull('fecha_recepcion')
            ->exists();

        if ($tieneRecepcionPendiente) {
            return back()->withErrors([
                'id_documento' => 'No se puede reenviar el oficio mientras exista una recepción pendiente en el área actual.',
            ]);
        }

        /** @var array<int, array{a_area_id: int, destinatario_user_id: int}> $copiasInput */
        $copiasInput = collect($request->input('copias', []))
            ->filter(fn($c) => !empty($c['a_area_id']) && !empty($c['destinatario_user_id']))
            ->map(fn($c) => [
                'a_area_id'            => (int) $c['a_area_id'],
                'destinatario_user_id' => (int) $c['destinatario_user_id'],
            ])
            ->values()
            ->all();

        $movimientoId  = null;
        $copiaIds      = [];

        try {
            DB::transaction(function () use ($documento, $deAreaId, $aAreaId, $destinatarioUserId, $request, $user, $copiasInput, &$movimientoId, &$copiaIds): void {
                $expedienteId = $documento->expediente_id;

                if ($expedienteId === null) {
                    $now = now();
                    $year = $now->format('Y');
                    $month = $now->format('m');

                    $count = Expediente::query()
                        ->select('id_expediente')
                        ->whereYear('fecha_inicio', $year)
                        ->whereMonth('fecha_inicio', $month)
                        ->lockForUpdate()
                        ->get()
                        ->count();

                    $codigo = 'EXP-' . $year . $month . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);

                    $expediente = Expediente::create([
                        'codigo_expediente' => $codigo,
                        'asunto_resumen' => $request->input('comentario') ?? $documento->asunto ?? $documento->numero_oficio,
                        'estado' => 'abierto',
                        'fecha_inicio' => $now->toDateString(),
                        'prioridad' => 'media',
                        'area_creadora_id' => $deAreaId,
                    ]);

                    $expedienteId = $expediente->id_expediente;
                    $documento->update(['expediente_id' => $expedienteId]);
                }

                $movimiento = Movimiento::create([
                    'documento_id'          => $documento->id_documento,
                    'expediente_id'         => $expedienteId,
                    'de_area_id'            => $deAreaId,
                    'a_area_id'             => $aAreaId,
                    'destinatario_user_id'  => $destinatarioUserId,
                    'enviado_por'           => $user->id_user,
                    'comentario'            => $request->input('comentario'),
                    'fecha_envio'           => now(),
                    'es_copia'              => false,
                ]);

                $movimientoId = $movimiento->id_movimiento;

                // Copias informativas — no mueven area_actual_id del documento
                foreach ($copiasInput as $copia) {
                    $movCopia = Movimiento::create([
                        'documento_id'          => $documento->id_documento,
                        'expediente_id'         => $expedienteId,
                        'de_area_id'            => $deAreaId,
                        'a_area_id'             => $copia['a_area_id'],
                        'destinatario_user_id'  => $copia['destinatario_user_id'],
                        'enviado_por'           => $user->id_user,
                        'comentario'            => $request->input('comentario'),
                        'fecha_envio'           => now(),
                        'es_copia'              => true,
                        'movimiento_original_id' => $movimientoId,
                    ]);
                    $copiaIds[] = $movCopia->id_movimiento;
                }

                $documento->update([
                    'area_actual_id' => $aAreaId,
                    'recibido'       => 'enviado',
                ]);
            });
        } catch (Throwable $exception) {
            $this->logDatabaseError('Error de base de datos al enviar documento', $exception, [
                'documento_id'          => $documento->id_documento,
                'de_area_id'            => $deAreaId,
                'a_area_id'             => $aAreaId,
                'destinatario_user_id'  => $destinatarioUserId,
                'enviado_por'           => $user->id_user,
                'total_copias'          => count($copiasInput),
            ]);

            throw $exception;
        }

        Log::channel('movimientos')->info('Documento enviado', [
            'id_movimiento'   => $movimientoId,
            'documento_id'    => $documento->id_documento,
            'de_area_id'      => $deAreaId,
            'a_area_id'       => $aAreaId,
            'destinatario_user_id' => $destinatarioUserId,
            'enviado_por'     => $user->id_user,
            'copias'          => $copiaIds,
        ]);

        // Broadcasting del movimiento original
        if ($movimientoId !== null) {
            $movimiento = Movimiento::query()
                ->with([
                    'documento:id_documento,numero_oficio,area_actual_id',
                    'deArea:id_area,nombre',
                    'aArea:id_area,nombre',
                    'destinatario:id_user,nombre,apellido',
                ])
                ->where('id_movimiento', $movimientoId)
                ->first();

            if ($movimiento !== null) {
                $allAreaIds = array_merge([$deAreaId, $aAreaId], array_column($copiasInput, 'a_area_id'));
                $this->dispatchMovimientoActualizado(
                    'enviado',
                    $this->buildBroadcastPayload($movimiento, $user),
                    $allAreaIds,
                );
            }
        }

        // Notificación al destinatario original
        if ($movimientoId !== null) {
            $movimientoParaNotif = Movimiento::query()
                ->with(['deArea:id_area,nombre', 'aArea:id_area,nombre'])
                ->find($movimientoId);

            if ($movimientoParaNotif !== null) {
                $this->notificarDestinatarios($documento, $movimientoParaNotif, $aAreaId, $destinatarioUserId);
            }
        }

        // Notificaciones a destinatarios de copias
        foreach ($copiaIds as $copiaId) {
            $moviCopia = Movimiento::query()
                ->with(['deArea:id_area,nombre', 'aArea:id_area,nombre'])
                ->find($copiaId);

            if ($moviCopia !== null) {
                $this->notificarDestinatarios(
                    $documento,
                    $moviCopia,
                    $moviCopia->a_area_id,
                    $moviCopia->destinatario_user_id,
                );
            }
        }

        return to_route('user.documentos.show', $documento->id_documento)
            ->with('success', 'El oficio fue enviado correctamente.');
    }

    /**
     * Marca un movimiento como recibido y actualiza el estado del documento a `recibido`.
     *
     * Solo el área destino (y el destinatario específico si aplica) puede marcar la recepción.
     * Emite evento de broadcasting tras la transacción.
     *
     * @param  Request    $request
     * @param  Movimiento $movimiento Movimiento a recibir (route model binding).
     * @return RedirectResponse
     */
    public function marcarRecibido(Request $request, Movimiento $movimiento): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null, 403);
        abort_unless(
            $user->area_id === $movimiento->a_area_id
                && ($movimiento->destinatario_user_id === null || (int) $movimiento->destinatario_user_id === (int) $user->id_user),
            403
        );

        $fechaRecepcion = now();

        try {
            DB::transaction(function () use ($movimiento, $fechaRecepcion): void {
                $movimiento->update([
                    'fecha_recepcion' => $fechaRecepcion,
                ]);

                $movimiento->documento()->update([
                    'recibido' => 'recibido',
                ]);
            });
        } catch (Throwable $exception) {
            $this->logDatabaseError('Error de base de datos al recibir documento', $exception, [
                'movimiento_id' => $movimiento->id_movimiento,
                'documento_id' => $movimiento->documento_id,
                'de_area_id' => $movimiento->de_area_id,
                'a_area_id' => $movimiento->a_area_id,
                'recibido_por' => $user->id_user,
            ]);

            throw $exception;
        }

        Log::channel('movimientos')->info('Documento recibido', [
            'id_movimiento' => $movimiento->id_movimiento,
            'documento_id' => $movimiento->documento_id,
            'de_area_id' => $movimiento->de_area_id,
            'a_area_id' => $movimiento->a_area_id,
            'fecha_recepcion' => $fechaRecepcion->toDateTimeString(),
            'recibido_por' => $user->id_user,
        ]);

        $movimiento->loadMissing([
            'documento:id_documento,numero_oficio,area_actual_id',
            'deArea:id_area,nombre',
            'aArea:id_area,nombre',
            'destinatario:id_user,nombre,apellido',
        ]);

        $this->dispatchMovimientoActualizado(
            'recibido',
            $this->buildBroadcastPayload($movimiento, $user),
            [$movimiento->de_area_id, $movimiento->a_area_id],
        );

        return back()->with('success', 'El oficio fue marcado como recibido.');
    }

    /**
     * Muestra el detalle de un movimiento con su documento y el historial del hilo.
     *
     * Si el usuario pertenece al área destino y no ha recibido el movimiento,
     * lo marca automáticamente como recibido al visualizarlo.
     *
     * @param  Request    $request
     * @param  Movimiento $movimiento Movimiento a visualizar (route model binding).
     * @return Response
     */
    public function show(Request $request, Movimiento $movimiento): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        abort_unless(
            $user->rol === 'admin'
                || $user->area_id === $movimiento->de_area_id
                || (
                    $user->area_id === $movimiento->a_area_id
                    && ($movimiento->destinatario_user_id === null || (int) $movimiento->destinatario_user_id === (int) $user->id_user)
                ),
            403
        );

        $movimiento->load([
            'documento' => function ($query) {
                $query->with([
                    'area:id_area,nombre',
                    'remitente:id_remitente,nombre',
                    'user:id_user,nombre,apellido',
                    'expediente:id_expediente,codigo_expediente,estado',
                ]);
            },
            'deArea:id_area,nombre',
            'aArea:id_area,nombre',
            'remitente:id_user,nombre,apellido',
            'destinatario:id_user,nombre,apellido',
        ]);

        // Marcar como recibido automáticamente al visualizar
        if (
            $user->area_id === $movimiento->a_area_id
            && ($movimiento->destinatario_user_id === null || (int) $movimiento->destinatario_user_id === (int) $user->id_user)
            && $movimiento->fecha_recepcion === null
        ) {
            $fechaRecepcion = now();
            try {
                DB::transaction(function () use ($movimiento, $fechaRecepcion): void {
                    $movimiento->update([
                        'fecha_recepcion' => $fechaRecepcion,
                    ]);
                    $movimiento->documento()->update([
                        'recibido' => 'recibido',
                    ]);
                });
            } catch (\Throwable $exception) {
                $this->logDatabaseError('Error de base de datos al marcar recibido desde show', $exception, [
                    'movimiento_id' => $movimiento->id_movimiento,
                    'documento_id' => $movimiento->documento_id,
                    'de_area_id' => $movimiento->de_area_id,
                    'a_area_id' => $movimiento->a_area_id,
                    'recibido_por' => $user->id_user,
                ]);
            }
            Log::channel('movimientos')->info('Documento recibido automáticamente al visualizar', [
                'id_movimiento' => $movimiento->id_movimiento,
                'documento_id' => $movimiento->documento_id,
                'de_area_id' => $movimiento->de_area_id,
                'a_area_id' => $movimiento->a_area_id,
                'fecha_recepcion' => $fechaRecepcion->toDateTimeString(),
                'recibido_por' => $user->id_user,
            ]);
        }

        $movimientos = Movimiento::query()
            ->with([
                'deArea:id_area,nombre',
                'aArea:id_area,nombre',
                'remitente:id_user,nombre,apellido',
                'destinatario:id_user,nombre,apellido',
            ])
            ->where('documento_id', $movimiento->documento_id)
            ->when($user->rol !== 'admin', function (Builder $query) use ($user): void {
                $query->where(function (Builder $nested) use ($user): void {
                    $nested->where('de_area_id', $user->area_id)
                        ->orWhere(function (Builder $destino) use ($user): void {
                            $destino->where('a_area_id', $user->area_id)
                                ->where(function (Builder $destinatario) use ($user): void {
                                    $destinatario->whereNull('destinatario_user_id')
                                        ->orWhere('destinatario_user_id', $user->id_user);
                                });
                        });
                });
            })
            ->orderByDesc('fecha_envio')
            ->get([
                'id_movimiento',
                'documento_id',
                'de_area_id',
                'a_area_id',
                'destinatario_user_id',
                'enviado_por',
                'comentario',
                'fecha_envio',
                'fecha_recepcion',
            ]);

        return Inertia::render('user/movimientos/show', [
            'movimiento' => $movimiento,
            'documento' => $movimiento->documento,
            'movimientos' => $movimientos,
            'canEnviar' => $user->rol === 'admin' || $user->area_id === $movimiento->documento?->area_actual_id,
        ]);
    }

    /**
     * Muestra el formulario para responder un movimiento entrante.
     *
     * Bloquea el acceso si el expediente está cerrado o el usuario no es el destinatario.
     *
     * @param  Request    $request
     * @param  Movimiento $movimiento Movimiento a responder (route model binding).
     * @return Response|RedirectResponse
     */
    public function responder(Request $request, Movimiento $movimiento): Response|RedirectResponse
    {
        $user = $request->user();

        abort_unless(
            $user !== null
                && $user->area_id === $movimiento->a_area_id
                && ($movimiento->destinatario_user_id === null || (int) $movimiento->destinatario_user_id === (int) $user->id_user),
            403
        );

        // Verificar que el expediente no esté cerrado
        if ($movimiento->expediente_id) {
            $expediente = Expediente::find($movimiento->expediente_id);
            if ($expediente && $expediente->estado === 'cerrado') {
                // Redirigir de vuelta con error
                return redirect()->back()->withErrors([
                    'error' => 'No se puede responder porque el expediente está cerrado.',
                ]);
            }
        }

        $movimiento->load([
            'documento:id_documento,numero_oficio,palabra_clave,tipo,remitente_id',
            'deArea:id_area,nombre',
            'aArea:id_area,nombre',
        ]);

        return Inertia::render('user/documentos/responder', [
            'movimiento' => $movimiento,
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('id_remitente')
                ->get(['id_remitente', 'nombre']),
            'tipos' => ['interno', 'externo'],
        ]);
    }

    /**
     * Procesa y almacena la respuesta a un movimiento.
     *
     * Delega a {@see storeRespuestaComentario} si el flag `solo_comentario` está activo,
     * o a {@see storeRespuestaDocumento} si se sube un archivo de respuesta.
     *
     * @param  StoreRespuestaOficioRequest $request Datos validados de la respuesta.
     * @return RedirectResponse
     */
    public function storeRespuesta(StoreRespuestaOficioRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $movimiento = Movimiento::query()->findOrFail($request->integer('movimiento_id'));

        abort_unless(
            $user->area_id === $movimiento->a_area_id
                && ($movimiento->destinatario_user_id === null || (int) $movimiento->destinatario_user_id === (int) $user->id_user),
            403
        );

        if ($movimiento->expediente_id) {
            $expediente = Expediente::find($movimiento->expediente_id);
            if ($expediente && $expediente->estado === 'cerrado') {
                return back()->withErrors([
                    'movimiento_id' => 'No se puede responder porque el expediente está cerrado.',
                ]);
            }
        }

        if ($request->boolean('solo_comentario')) {
            return $this->storeRespuestaComentario($request, $user, $movimiento);
        }

        return $this->storeRespuestaDocumento($request, $user, $movimiento);
    }

    /**
     * Registra una respuesta textual al movimiento sin generar un nuevo documento.
     *
     * Crea un movimiento de respuesta B→A sobre el mismo documento, marca el original
     * como respondido y, si aplica, lo marca como recibido en la misma transacción.
     * Emite broadcasting y notificación por correo.
     *
     * @param  StoreRespuestaOficioRequest $request
     * @param  \App\Models\User            $user
     * @param  Movimiento                  $movimiento Movimiento original a responder.
     * @return RedirectResponse
     */
    private function storeRespuestaComentario(
        StoreRespuestaOficioRequest $request,
        \App\Models\User $user,
        Movimiento $movimiento,
    ): RedirectResponse {
        $fechaRecepcionOriginal = null;
        $movimientoRespuestaId  = null;

        try {
            DB::transaction(function () use ($request, $user, $movimiento, &$fechaRecepcionOriginal, &$movimientoRespuestaId): void {
                if ($movimiento->fecha_recepcion === null) {
                    $fechaRecepcionOriginal = now();

                    $movimiento->update([
                        'fecha_recepcion' => $fechaRecepcionOriginal,
                    ]);

                    $movimiento->documento()->update([
                        'recibido' => 'recibido',
                    ]);
                }

                // Marcar el movimiento original como respondido por comentario
                $movimiento->update([
                    'respuesta_comentario' => $request->input('comentario_envio'),
                ]);

                // Crear el movimiento de respuesta (B→A) referenciando el mismo documento
                $movimientoRespuesta = Movimiento::create([
                    'documento_id'            => $movimiento->documento_id,
                    'de_area_id'              => $user->area_id,
                    'a_area_id'               => $movimiento->de_area_id,
                    'destinatario_user_id'    => $movimiento->enviado_por,
                    'enviado_por'             => $user->id_user,
                    'comentario'              => $request->input('comentario_envio'),
                    'fecha_envio'             => now(),
                    'expediente_id'           => $movimiento->expediente_id,
                    'es_respuesta_comentario' => true,
                ]);

                $movimientoRespuestaId = $movimientoRespuesta->id_movimiento;
            });
        } catch (Throwable $exception) {
            $this->logDatabaseError('Error al guardar respuesta por comentario', $exception, [
                'movimiento_id' => $movimiento->id_movimiento,
                'user_id'       => $user->id_user,
            ]);

            throw $exception;
        }

        Log::channel('movimientos')->info('Movimiento respondido con comentario', [
            'id_movimiento'          => $movimiento->id_movimiento,
            'movimiento_respuesta_id' => $movimientoRespuestaId,
            'documento_id'           => $movimiento->documento_id,
            'user_id'                => $user->id_user,
        ]);

        if ($fechaRecepcionOriginal !== null) {
            Log::channel('movimientos')->info('Documento recibido automaticamente al responder con comentario', [
                'id_movimiento'  => $movimiento->id_movimiento,
                'fecha_recepcion' => $fechaRecepcionOriginal->toDateTimeString(),
            ]);
        }

        if ($movimientoRespuestaId !== null) {
            $movimientoRespuesta = Movimiento::query()
                ->with([
                    'deArea:id_area,nombre',
                    'aArea:id_area,nombre',
                    'destinatario:id_user,nombre,apellido',
                ])
                ->find($movimientoRespuestaId);

            if ($movimientoRespuesta !== null) {
                $this->dispatchMovimientoActualizado(
                    'respondido',
                    $this->buildBroadcastPayload($movimientoRespuesta, $user),
                    [$movimientoRespuesta->de_area_id, $movimientoRespuesta->a_area_id],
                );

                $documento = Documento::query()->find($movimiento->documento_id);

                if ($documento !== null) {
                    $this->notificarDestinatarios(
                        $documento,
                        $movimientoRespuesta,
                        $movimiento->de_area_id,
                        $movimiento->enviado_por,
                    );
                }
            }
        }

        return to_route('user.documentos.show', $movimiento->documento_id)
            ->with('success', 'La respuesta fue registrada correctamente.');
    }

    /**
     * Crea un documento de respuesta (nuevo oficio hijo) y lo envía al área origen.
     *
     * Dentro de una transacción: sube el archivo, ejecuta OCR sincrónico, crea el
     * documento hijo vinculado al hilo, genera el movimiento de respuesta B→A y
     * actualiza el área actual del documento. Emite broadcasting y notificación por correo.
     *
     * @param  StoreRespuestaOficioRequest $request
     * @param  \App\Models\User            $user
     * @param  Movimiento                  $movimiento Movimiento original al que se responde.
     * @return RedirectResponse
     */
    private function storeRespuestaDocumento(
        StoreRespuestaOficioRequest $request,
        \App\Models\User $user,
        Movimiento $movimiento,
    ): RedirectResponse {
        $movimientoRespuestaId = null;
        $fechaRecepcionOriginal = null;

        try {
            $documentoRespuesta = DB::transaction(function () use ($request, $user, $movimiento, &$movimientoRespuestaId, &$fechaRecepcionOriginal): Documento {
                $movimiento->loadMissing([
                    'documento:id_documento,hilo_id',
                ]);

                $hiloId = $movimiento->documento?->hilo_id ?? $movimiento->documento_id;

                if ($movimiento->fecha_recepcion === null) {
                    $fechaRecepcionOriginal = now();

                    $movimiento->update([
                        'fecha_recepcion' => $fechaRecepcionOriginal,
                    ]);

                    $movimiento->documento()->update([
                        'recibido' => 'recibido',
                    ]);
                }

                $documento = $this->crearDocumentoRespuesta($request, $user, $movimiento, $hiloId);

                Log::channel('documentos')->info('Documento de respuesta creado', [
                    'id_documento' => $documento->id_documento,
                    'user_id' => $documento->user_id,
                    'area_actual_id' => $documento->area_actual_id,
                    'documento_padre_id' => $documento->documento_padre_id,
                ]);

                $archivoPath = $this->storeArchivoConDocumentoId($request->file('archivo'), $documento);

                $documento->update([
                    'archivo' => $archivoPath,
                ]);

                try {
                    $ocrText = $this->ocrService->extractText(storage_path('app/public/' . $archivoPath));

                    $documento->update([
                        'contenido_ocr' => $ocrText !== '' ? $ocrText : null,
                    ]);
                } catch (Throwable $exception) {
                    $this->logOcrError('OCR falló al crear documento de respuesta', $exception, [
                        'id_documento' => $documento->id_documento,
                        'user_id' => $documento->user_id,
                        'area_actual_id' => $documento->area_actual_id,
                        'archivo' => $archivoPath,
                        'documento_padre_id' => $documento->documento_padre_id,
                    ]);
                }

                $movimientoRespuesta = Movimiento::create([
                    'documento_id' => $documento->id_documento,
                    'de_area_id' => $user->area_id,
                    'a_area_id' => $movimiento->de_area_id,
                    'destinatario_user_id' => $movimiento->enviado_por,
                    'enviado_por' => $user->id_user,
                    'comentario' => $request->input('comentario_envio'),
                    'fecha_envio' => now(),
                    'expediente_id' => $documento->expediente_id,
                ]);

                $movimientoRespuestaId = $movimientoRespuesta->id_movimiento;

                $documento->update([
                    'area_actual_id' => $movimiento->de_area_id,
                    'recibido' => 'enviado',
                ]);

                return $documento;
            });
        } catch (Throwable $exception) {
            $this->logDatabaseError('Error de base de datos al crear respuesta de documento', $exception, [
                'movimiento_id' => $movimiento->id_movimiento,
                'documento_padre_id' => $movimiento->documento_id,
                'user_id' => $user->id_user,
                'area_actual_id' => $user->area_id,
            ]);

            throw $exception;
        }

        Log::channel('movimientos')->info('Documento de respuesta enviado', [
            'id_documento' => $documentoRespuesta->id_documento,
            'id_movimiento' => $movimientoRespuestaId,
            'documento_padre_id' => $movimiento->documento_id,
            'user_id' => $user->id_user,
            'area_actual_id' => $user->area_id,
            'de_area_id' => $user->area_id,
            'a_area_id' => $movimiento->de_area_id,
        ]);

        if ($fechaRecepcionOriginal !== null) {
            Log::channel('movimientos')->info('Documento recibido automaticamente al responder', [
                'id_movimiento' => $movimiento->id_movimiento,
                'documento_id' => $movimiento->documento_id,
                'de_area_id' => $movimiento->de_area_id,
                'a_area_id' => $movimiento->a_area_id,
                'fecha_recepcion' => $fechaRecepcionOriginal->toDateTimeString(),
                'recibido_por' => $user->id_user,
            ]);
        }

        if ($movimientoRespuestaId !== null) {
            $movimientoRespuesta = Movimiento::query()
                ->with([
                    'documento:id_documento,numero_oficio,area_actual_id,documento_padre_id',
                    'deArea:id_area,nombre',
                    'aArea:id_area,nombre',
                    'destinatario:id_user,nombre,apellido',
                ])
                ->where('id_movimiento', $movimientoRespuestaId)
                ->first();

            if ($movimientoRespuesta !== null) {
                $this->dispatchMovimientoActualizado(
                    'respondido',
                    $this->buildBroadcastPayload($movimientoRespuesta, $user),
                    [$movimientoRespuesta->de_area_id, $movimientoRespuesta->a_area_id],
                );
            }
        }

        if ($movimientoRespuestaId !== null) {
            $movimientoParaNotif = Movimiento::query()
                ->with(['deArea:id_area,nombre', 'aArea:id_area,nombre'])
                ->find($movimientoRespuestaId);

            if ($movimientoParaNotif !== null) {
                $this->notificarDestinatarios(
                    $documentoRespuesta,
                    $movimientoParaNotif,
                    $movimiento->de_area_id,
                    $movimiento->enviado_por,
                );
            }
        }

        return to_route('user.documentos.show', $documentoRespuesta->id_documento)
            ->with('success', 'El oficio de respuesta fue enviado correctamente.');
    }

    /**
     * Carga movimientos adicionales de un grupo (expediente, hilo o movimiento individual) vía AJAX.
     *
     * El parámetro `grupo` acepta los prefijos: `exp:{id}`, `raiz:{id}`, `mov:{id}`.
     * Aplica el scope de área del usuario y devuelve `has_more` para paginación incremental.
     *
     * @param  Request $request Parámetros: `grupo`, `offset`, `limit`.
     * @return \Illuminate\Http\JsonResponse
     */
    public function cargarMasPorGrupo(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $grupo = $request->input('grupo');
        $offset = (int) $request->input('offset', 0);
        $limit = (int) $request->input('limit', 5);

        if (str_starts_with($grupo, 'exp:')) {
            $expedienteId = (int) substr($grupo, 4);
            $query = Movimiento::query()->where('expediente_id', $expedienteId);
        } elseif (str_starts_with($grupo, 'raiz:')) {
            $documentoRaizId = (int) substr($grupo, 5);
            $query = Movimiento::query()->whereHas('documento', function ($q) use ($documentoRaizId): void {
                $q->where('hilo_id', $documentoRaizId)
                    ->orWhere('documento_padre_id', $documentoRaizId)
                    ->orWhere('id_documento', $documentoRaizId);
            });
        } elseif (str_starts_with($grupo, 'mov:')) {
            $movimientoId = (int) substr($grupo, 4);
            $query = Movimiento::query()->where('id_movimiento', $movimientoId);
        } else {
            return response()->json(['error' => 'Grupo inválido'], 400);
        }

        $query->where(function (Builder $q) use ($user): void {
            $q->where('de_area_id', $user->area_id)
                ->orWhere(function (Builder $destino) use ($user): void {
                    $destino->where('a_area_id', $user->area_id)
                        ->where(function (Builder $destinatario) use ($user): void {
                            $destinatario->whereNull('destinatario_user_id')
                                ->orWhere('destinatario_user_id', $user->id_user);
                        });
                });
        });

        $total = $query->count();
        $collection = $query->orderByDesc('fecha_envio')
            ->orderByDesc('id_movimiento')
            ->skip($offset)
            ->take($limit + 1)
            ->with([
                'documento:id_documento,numero_oficio,asunto,palabra_clave,tipo,recibido,user_id,area_actual_id,area_creadora_id,documento_padre_id,movimiento_origen_id,hilo_id',
                'documento.documentoHilo:id_documento,numero_oficio,asunto,user_id,conversacion_cerrada_at',
                'documento.documentoPadre:id_documento,numero_oficio,asunto',
                'documento.movimientoOrigen:id_movimiento,documento_id,de_area_id,a_area_id,comentario,fecha_envio',
                'documento.movimientoOrigen.documento:id_documento,numero_oficio,asunto',
                'deArea:id_area,nombre',
                'aArea:id_area,nombre',
                'remitente:id_user,nombre,apellido,area_id',
                'remitente.area:id_area,nombre',
                'destinatario:id_user,nombre,apellido',
                'documentosGenerados:id_documento,movimiento_origen_id',
                'expediente:id_expediente,prioridad,estado',
            ])
            ->get();

        $hasMore = $collection->count() > $limit;
        $collection = $collection->take($limit)->values();

        $resultados = $collection->map(function (Movimiento $movimiento) use ($user): array {
            $esDestinatario = $movimiento->destinatario_user_id === null
                || (int) $movimiento->destinatario_user_id === (int) $user->id_user;
            $esMovimientoEntrante = $movimiento->a_area_id === $user->area_id && $esDestinatario;
            $hiloId = $movimiento->documento?->hilo_id;
            $movimientoOrigen = $movimiento->documento?->movimientoOrigen;
            $respuestaEnviada = $movimiento->documentosGenerados->isNotEmpty() || $movimiento->respuesta_comentario !== null;
            $diasLaborales = $movimiento->fecha_envio
                ? $this->calcularDiasLaborales(\Carbon\Carbon::parse($movimiento->fecha_envio), now())
                : 0;
            $bloqueado = $esMovimientoEntrante && !$respuestaEnviada && $diasLaborales > 10;

            return [
                'id_movimiento' => $movimiento->id_movimiento,
                'documento' => [
                    'id_documento' => $movimiento->documento?->id_documento,
                    'numero_oficio' => $movimiento->documento?->numero_oficio,
                    'asunto' => $movimiento->documento?->asunto,
                    'palabra_clave' => $movimiento->documento?->palabra_clave,
                    'tipo' => $movimiento->documento?->tipo,
                    'recibido' => $movimiento->documento?->recibido,
                    'documento_padre_id' => $movimiento->documento?->documento_padre_id,
                    'movimiento_origen_id' => $movimiento->documento?->movimiento_origen_id,
                    'padre' => [
                        'id_documento' => $movimiento->documento?->documentoPadre?->id_documento,
                        'numero_oficio' => $movimiento->documento?->documentoPadre?->numero_oficio,
                        'asunto' => $movimiento->documento?->documentoPadre?->asunto,
                    ],
                    'movimiento_origen' => $movimientoOrigen ? [
                        'id_movimiento' => $movimientoOrigen->id_movimiento,
                        'comentario' => $movimientoOrigen->comentario,
                        'documento' => [
                            'id_documento' => $movimientoOrigen->documento?->id_documento,
                            'numero_oficio' => $movimientoOrigen->documento?->numero_oficio,
                            'asunto' => $movimientoOrigen->documento?->asunto,
                        ],
                    ] : null,
                    'hilo_id' => $hiloId,
                    'conversacion_cerrada_at' => $movimiento->documento?->documentoHilo?->conversacion_cerrada_at,
                ],
                'de_area' => ['nombre' => $movimiento->deArea?->nombre],
                'a_area' => ['nombre' => $movimiento->aArea?->nombre],
                'destinatario_user_id' => $movimiento->destinatario_user_id,
                'destinatario' => [
                    'nombre' => $movimiento->destinatario?->nombre,
                    'apellido' => $movimiento->destinatario?->apellido,
                ],
                'remitente' => [
                    'nombre' => $movimiento->remitente?->nombre,
                    'apellido' => $movimiento->remitente?->apellido,
                    'area' => ['nombre' => $movimiento->remitente?->area?->nombre],
                ],
                'comentario'              => $movimiento->comentario,
                'respuesta_comentario'    => $movimiento->respuesta_comentario,
                'es_respuesta_comentario' => (bool) $movimiento->es_respuesta_comentario,
                'fecha_envio'             => $movimiento->fecha_envio,
                'fecha_recepcion' => $movimiento->fecha_recepcion,
                'direccion' => $movimiento->de_area_id === $user->area_id ? 'salida' : 'entrada',
                'estado' => $movimiento->fecha_recepcion === null ? 'pendiente' : 'recibido',
                'respuesta_enviada' => $respuestaEnviada,
                'puede_marcar_recibido' => $esMovimientoEntrante && $movimiento->fecha_recepcion === null,
                'puede_responder' => $esMovimientoEntrante && !$respuestaEnviada && !$bloqueado,
                'dias_transcurridos' => $diasLaborales,
                'bloqueado' => $bloqueado,
                'es_copia' => (bool) $movimiento->es_copia,
            ];
        });

        return response()->json([
            'movimientos' => $resultados,
            'has_more' => $hasMore,
            'total' => $total,
            'offset' => $offset,
            'limit' => $limit,
        ]);
    }

    // ==================== MÉTODOS PROTEGIDOS/PRIVADOS ====================

    /**
     * Cuenta los días laborales (lunes a viernes) entre dos fechas, sin incluir el día inicial.
     *
     * @param  \Carbon\CarbonInterface $inicio Fecha de inicio.
     * @param  \Carbon\CarbonInterface $fin    Fecha de fin.
     * @return int
     */
    private function calcularDiasLaborales(\Carbon\CarbonInterface $inicio, \Carbon\CarbonInterface $fin): int
{
    $dias = 0;
    $current = $inicio->copy()->addDay()->startOfDay();
    $end = $fin->copy()->startOfDay();

    while ($current->lte($end)) {
        if ($current->isWeekday()) {
            $dias++;
        }
        $current->addDay();
    }

    return $dias;
}

    /**
     * Crea y persiste el registro del documento de respuesta vinculado al hilo y al movimiento origen.
     *
     * @param  StoreRespuestaOficioRequest $request
     * @param  User                        $user
     * @param  Movimiento                  $movimiento  Movimiento al que se responde.
     * @param  int                         $hiloId      ID del documento raíz del hilo de conversación.
     * @return Documento Documento recién creado con path temporal aún sin renombrar.
     */
    protected function crearDocumentoRespuesta(
        StoreRespuestaOficioRequest $request,
        User $user,
        Movimiento $movimiento,
        int $hiloId,
    ): Documento {
        return Documento::create([
            ...$request->safe()->except(['archivo', 'movimiento_id', 'comentario_envio']),
            'fecha_oficio' => now()->toDateString(),
            'tipo' => 'interno',
            'archivo' => 'documentos/tmp/' . $request->file('archivo')->hashName(),
            'user_id' => $user->id_user,
            'area_actual_id' => $user->area_id,
            'area_creadora_id' => $user->area_id,
            'documento_padre_id' => $movimiento->documento_id,
            'movimiento_origen_id' => $movimiento->id_movimiento,
            'hilo_id' => $hiloId,
            'recibido' => 'subido',
            'expediente_id' => $movimiento->expediente_id,
        ]);
    }

    /**
     * Mueve el archivo subido al path definitivo `documentos/{id}.{ext}` en el disco público.
     *
     * @param  UploadedFile $archivo   Archivo subido por el usuario.
     * @param  Documento    $documento Documento ya persistido cuyo ID se usa como nombre.
     * @return string Path final relativo al disco público.
     */
    private function storeArchivoConDocumentoId(UploadedFile $archivo, Documento $documento): string
    {
        $temporaryPath = $archivo->store('documentos/tmp', 'public');
        $extension = $archivo->getClientOriginalExtension() ?: $archivo->extension() ?: 'pdf';
        $finalPath = 'documentos/' . $documento->id_documento . '.' . $extension;

        Storage::disk('public')->delete($finalPath);
        Storage::disk('public')->move($temporaryPath, $finalPath);

        return $finalPath;
    }

    /**
     * Registra un error de OCR en el canal `errores` con nivel `error`.
     *
     * @param  string               $message
     * @param  Throwable            $exception
     * @param  array<string, mixed> $context
     * @return void
     */
    private function logOcrError(string $message, Throwable $exception, array $context): void
    {
        Log::channel('errores')->error($message, [
            ...$context,
            'exception_class' => $exception::class,
            'exception_message' => $exception->getMessage(),
        ]);
    }

    /**
     * Envía una notificación por correo a los destinatarios del movimiento.
     *
     * Si hay `$destinatarioUserId` notifica solo a ese usuario; de lo contrario,
     * notifica a todos los usuarios activos del área destino. Los errores se absorben
     * y se registran en el canal `errores` para no interrumpir el flujo principal.
     *
     * @param  Documento $documento
     * @param  Movimiento $movimiento
     * @param  int        $aAreaId          ID del área destino.
     * @param  int|null   $destinatarioUserId ID del usuario específico, o null para el área completa.
     * @return void
     */
    private function notificarDestinatarios(
        Documento $documento,
        Movimiento $movimiento,
        int $aAreaId,
        ?int $destinatarioUserId,
    ): void {
        try {
            if ($destinatarioUserId !== null) {
                $usuarios = User::query()
                    ->where('id_user', $destinatarioUserId)
                    ->whereNotNull('email')
                    ->get(['id_user', 'nombre', 'apellido', 'email']);
            } else {
                $usuarios = User::query()
                    ->where('area_id', $aAreaId)
                    ->where('estado', 'aprobado')
                    ->where('habilitado', true)
                    ->whereNotNull('email')
                    ->get(['id_user', 'nombre', 'apellido', 'email']);
            }

            foreach ($usuarios as $usuario) {
                $usuario->notify(new MovimientoDocumentoNotification($documento, $movimiento));
            }
        } catch (Throwable $exception) {
            Log::channel('errores')->warning('No se pudo encolar notificación de email al destinatario', [
                'id_documento' => $documento->id_documento,
                'a_area_id' => $aAreaId,
                'destinatario_user_id' => $destinatarioUserId,
                'exception_class' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Registra un error crítico de base de datos en el canal `errores`.
     *
     * @param  string               $message
     * @param  Throwable            $exception
     * @param  array<string, mixed> $context
     * @return void
     */
    private function logDatabaseError(string $message, Throwable $exception, array $context): void
    {
        Log::channel('errores')->critical($message, [
            ...$context,
            'exception_class' => $exception::class,
            'exception_message' => $exception->getMessage(),
        ]);
    }

    /**
     * Despacha el evento {@see DocumentoMovimientoActualizado} para broadcasting en tiempo real.
     *
     * Los errores se absorben y se registran en `errores` para no interrumpir el flujo.
     *
     * @param  string               $accion   Acción ocurrida: 'enviado', 'recibido', 'respondido'.
     * @param  array<string, mixed> $payload  Datos del evento.
     * @param  array<int, int|null> $areaIds  IDs de las áreas implicadas para filtrar listeners.
     * @return void
     */
    private function dispatchMovimientoActualizado(string $accion, array $payload, array $areaIds): void
    {
        try {
            $this->dashboardQueries->invalidarStatsDeAreas($areaIds);
            DocumentoMovimientoActualizado::dispatch($accion, $payload, $areaIds);
        } catch (Throwable $exception) {
            Log::channel('errores')->warning('No se pudo emitir evento de movimiento en tiempo real', [
                'accion' => $accion,
                'area_ids' => array_values(array_filter($areaIds)),
                'exception_class' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Construye el payload completo del evento de broadcasting para un movimiento.
     *
     * Incluye datos del movimiento, documento, áreas origen/destino, usuario que actúa
     * y el destinatario, más un timestamp de emisión.
     *
     * @param  Movimiento $movimiento Movimiento con relaciones `documento`, `deArea`, `aArea` y `destinatario` cargadas.
     * @param  User       $usuario    Usuario que realizó la acción.
     * @return array<string, mixed>
     */
    private function buildBroadcastPayload(Movimiento $movimiento, User $usuario): array
    {
        return [
            'movimiento' => [
                'id_movimiento' => $movimiento->id_movimiento,
                'documento_id' => $movimiento->documento_id,
                'de_area_id' => $movimiento->de_area_id,
                'a_area_id' => $movimiento->a_area_id,
                'destinatario_user_id' => $movimiento->destinatario_user_id,
                'enviado_por' => $movimiento->enviado_por,
                'comentario' => $movimiento->comentario,
                'fecha_envio' => $movimiento->fecha_envio,
                'fecha_recepcion' => $movimiento->fecha_recepcion,
            ],
            'documento' => [
                'id_documento' => $movimiento->documento?->id_documento,
                'numero_oficio' => $movimiento->documento?->numero_oficio,
                'area_actual_id' => $movimiento->documento?->area_actual_id,
                'documento_padre_id' => $movimiento->documento?->documento_padre_id,
            ],
            'areas' => [
                'origen' => [
                    'id_area' => $movimiento->de_area_id,
                    'nombre' => $movimiento->deArea?->nombre,
                ],
                'destino' => [
                    'id_area' => $movimiento->a_area_id,
                    'nombre' => $movimiento->aArea?->nombre,
                ],
            ],
            'usuario' => [
                'id_user' => $usuario->id_user,
                'nombre' => $usuario->nombre,
                'apellido' => $usuario->apellido,
                'area_id' => $usuario->area_id,
                'rol' => $usuario->rol,
            ],
            'destinatario' => [
                'id_user' => $movimiento->destinatario_user_id,
                'nombre' => $movimiento->destinatario?->nombre,
                'apellido' => $movimiento->destinatario?->apellido,
            ],
            'emitted_at' => now()->toIso8601String(),
        ];
    }
}
