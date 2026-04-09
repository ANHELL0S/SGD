<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreRespuestaOficioRequest;
use App\Http\Requests\User\StoreMovimientoRequest;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\Remitente;
use App\Services\OcrService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MovimientoController extends Controller
{
    public function __construct(private readonly OcrService $ocrService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user !== null, 403);

        $movimientos = Movimiento::query()
            ->with([
                'documento:id_documento,numero_oficio,palabra_clave,tipo,recibido,user_id,area_actual_id,documento_padre_id',
                'documento.documentoPadre:id_documento,numero_oficio',
                'documento.user:id_user,nombre,apellido,area_id',
                'documento.user.area:id_area,nombre',
                'deArea:id_area,nombre',
                'aArea:id_area,nombre',
                'remitente:id_user,nombre,apellido,area_id',
                'remitente.area:id_area,nombre',
            ])
            ->where(function (Builder $query) use ($user): void {
                $query->where('de_area_id', $user->area_id)
                    ->orWhere('a_area_id', $user->area_id);
            })
            ->orderByDesc('fecha_envio')
            ->orderByDesc('id_movimiento')
            ->get([
                'id_movimiento',
                'documento_id',
                'de_area_id',
                'a_area_id',
                'enviado_por',
                'comentario',
                'fecha_envio',
                'fecha_recepcion',
            ]);

        $documentosRespondidosIds = $movimientos
            ->filter(fn (Movimiento $movimiento): bool => $movimiento->de_area_id === $user->area_id)
            ->map(fn (Movimiento $movimiento): ?int => $movimiento->documento?->documento_padre_id)
            ->filter()
            ->values();

        $motivos = $movimientos
            ->groupBy(function (Movimiento $movimiento): string {
                $motivo = trim((string) ($movimiento->comentario ?? ''));

                return $motivo !== '' ? $motivo : 'Sin motivo';
            })
            ->map(function ($grupo, string $motivo) use ($documentosRespondidosIds, $user): array {
                $grupoOrdenado = $grupo
                    ->sort(function (Movimiento $first, Movimiento $second): int {
                        $firstTimestamp = $first->fecha_envio !== null ? strtotime((string) $first->fecha_envio) : 0;
                        $secondTimestamp = $second->fecha_envio !== null ? strtotime((string) $second->fecha_envio) : 0;

                        if ($firstTimestamp !== $secondTimestamp) {
                            return $secondTimestamp <=> $firstTimestamp;
                        }

                        $firstDocumentoId = $first->documento_id ?? 0;
                        $secondDocumentoId = $second->documento_id ?? 0;

                        if ($firstDocumentoId !== $secondDocumentoId) {
                            return $secondDocumentoId <=> $firstDocumentoId;
                        }

                        return ($second->id_movimiento ?? 0) <=> ($first->id_movimiento ?? 0);
                    })
                    ->values();

                $movimientosDelMotivo = $grupoOrdenado->map(function (Movimiento $movimiento) use ($documentosRespondidosIds, $user): array {
                    $respuestaEnviada = $movimiento->documento_id !== null
                        && $documentosRespondidosIds->contains($movimiento->documento_id);

                    $esMovimientoEntrante = $movimiento->a_area_id === $user->area_id;

                    return [
                        'id_movimiento' => $movimiento->id_movimiento,
                        'documento' => [
                            'id_documento' => $movimiento->documento?->id_documento,
                            'numero_oficio' => $movimiento->documento?->numero_oficio,
                            'palabra_clave' => $movimiento->documento?->palabra_clave,
                            'tipo' => $movimiento->documento?->tipo,
                            'recibido' => $movimiento->documento?->recibido,
                            'documento_padre_id' => $movimiento->documento?->documento_padre_id,
                            'padre' => [
                                'id_documento' => $movimiento->documento?->documentoPadre?->id_documento,
                                'numero_oficio' => $movimiento->documento?->documentoPadre?->numero_oficio,
                            ],
                        ],
                        'de_area' => [
                            'nombre' => $movimiento->deArea?->nombre,
                        ],
                        'a_area' => [
                            'nombre' => $movimiento->aArea?->nombre,
                        ],
                        'remitente' => [
                            'nombre' => $movimiento->remitente?->nombre,
                            'apellido' => $movimiento->remitente?->apellido,
                            'area' => [
                                'nombre' => $movimiento->remitente?->area?->nombre,
                            ],
                        ],
                        'comentario' => $movimiento->comentario,
                        'fecha_envio' => $movimiento->fecha_envio,
                        'fecha_recepcion' => $movimiento->fecha_recepcion,
                        'direccion' => $movimiento->de_area_id === $user->area_id ? 'salida' : 'entrada',
                        'estado' => $movimiento->fecha_recepcion === null ? 'pendiente' : 'recibido',
                        'respuesta_enviada' => $esMovimientoEntrante && $respuestaEnviada,
                        'puede_marcar_recibido' => $movimiento->a_area_id === $user->area_id && $movimiento->fecha_recepcion === null,
                        'puede_responder' => $esMovimientoEntrante && ! $respuestaEnviada,
                    ];
                })->values();

                return [
                    'motivo' => $motivo,
                    'total_movimientos' => $grupoOrdenado->count(),
                    'salidas' => $grupoOrdenado->where('de_area_id', $user->area_id)->count(),
                    'entradas' => $grupoOrdenado->where('a_area_id', $user->area_id)->count(),
                    'pendientes' => $grupoOrdenado->whereNull('fecha_recepcion')->count(),
                    'recibidos' => $grupoOrdenado->whereNotNull('fecha_recepcion')->count(),
                    'ultima_fecha_envio' => $grupoOrdenado->first()?->fecha_envio,
                    'movimientos' => $movimientosDelMotivo,
                ];
            })
            ->sortByDesc('ultima_fecha_envio')
            ->values();

        return Inertia::render('user/movimientos/index', [
            'motivos' => $motivos,
            'resumen' => [
                'motivos' => $motivos->count(),
                'total' => $movimientos->count(),
                'salidas' => $movimientos->where('de_area_id', $user->area_id)->count(),
                'entradas' => $movimientos->where('a_area_id', $user->area_id)->count(),
                'pendientes' => $movimientos->whereNull('fecha_recepcion')->count(),
                'recibidos' => $movimientos->whereNotNull('fecha_recepcion')->count(),
            ],
        ]);
    }

    public function store(StoreMovimientoRequest $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null, 403);

        $documento = Documento::query()->findOrFail($request->integer('id_documento'));

        abort_unless($documento->area_actual_id === $user->area_id, 403);
        abort_unless($documento->area_actual_id !== $request->integer('a_area_id'), 422);

        DB::transaction(function () use ($request, $user, $documento): void {
            Movimiento::create([
                'documento_id' => $documento->id_documento,
                'de_area_id' => $documento->area_actual_id,
                'a_area_id' => $request->integer('a_area_id'),
                'enviado_por' => $user->id_user,
                'comentario' => $request->input('comentario'),
                'fecha_envio' => now(),
            ]);

            $documento->update([
                'area_actual_id' => $request->integer('a_area_id'),
                'recibido' => 'enviado',
            ]);
        });

        return to_route('user.documentos.show', $documento->id_documento)
            ->with('success', 'El oficio fue enviado correctamente.');
    }

    public function marcarRecibido(Request $request, Movimiento $movimiento): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null, 403);
        abort_unless($user->area_id === $movimiento->a_area_id, 403);

        DB::transaction(function () use ($movimiento): void {
            $movimiento->update([
                'fecha_recepcion' => now(),
            ]);

            $movimiento->documento()->update([
                'recibido' => 'recibido',
            ]);
        });

        return back()->with('success', 'El oficio fue marcado como recibido.');
    }

    public function responder(Request $request, Movimiento $movimiento): Response
    {
        $user = $request->user();

        abort_unless($user !== null && $user->area_id === $movimiento->a_area_id, 403);

        $movimiento->load([
            'documento:id_documento,numero_oficio,palabra_clave,tipo',
            'deArea:id_area,nombre',
            'aArea:id_area,nombre',
        ]);

        return Inertia::render('user/documentos/responder', [
            'movimiento' => $movimiento,
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('nombre')
                ->get(['id_remitente', 'nombre']),
            'tipos' => ['interno', 'externo'],
        ]);
    }

    public function storeRespuesta(StoreRespuestaOficioRequest $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null, 403);

        $movimiento = Movimiento::query()->findOrFail($request->integer('movimiento_id'));

        abort_unless($user->area_id === $movimiento->a_area_id, 403);

        $documentoRespuesta = DB::transaction(function () use ($request, $user, $movimiento): Documento {
            $documento = Documento::create([
                ...$request->safe()->except(['archivo', 'movimiento_id', 'comentario_envio']),
                'archivo' => 'documentos/tmp/'.$request->file('archivo')->hashName(),
                'user_id' => $user->id_user,
                'area_actual_id' => $user->area_id,
                'documento_padre_id' => $movimiento->documento_id,
                'recibido' => 'subido',
            ]);

            $archivoPath = $this->storeArchivoConDocumentoId($request->file('archivo'), $documento);

            $documento->update([
                'archivo' => $archivoPath,
            ]);

            try {
                $ocrText = $this->ocrService->extractText(storage_path('app/public/'.$archivoPath));

                $documento->update([
                    'contenido_ocr' => $ocrText !== '' ? $ocrText : null,
                ]);
            } catch (Throwable $exception) {
                report($exception);
            }

            Movimiento::create([
                'documento_id' => $documento->id_documento,
                'de_area_id' => $user->area_id,
                'a_area_id' => $movimiento->de_area_id,
                'enviado_por' => $user->id_user,
                'comentario' => $request->input('comentario_envio'),
                'fecha_envio' => now(),
            ]);

            $documento->update([
                'area_actual_id' => $movimiento->de_area_id,
                'recibido' => 'enviado',
            ]);

            return $documento;
        });

        return to_route('user.documentos.show', $documentoRespuesta->id_documento)
            ->with('success', 'El oficio de respuesta fue enviado correctamente.');
    }

    private function storeArchivoConDocumentoId(UploadedFile $archivo, Documento $documento): string
    {
        $temporaryPath = $archivo->store('documentos/tmp', 'public');
        $extension = $archivo->getClientOriginalExtension() ?: $archivo->extension() ?: 'pdf';
        $finalPath = 'documentos/'.$documento->id_documento.'.'.$extension;

        Storage::disk('public')->delete($finalPath);
        Storage::disk('public')->move($temporaryPath, $finalPath);

        return $finalPath;
    }
}
