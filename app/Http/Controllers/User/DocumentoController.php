<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreDocumentoRequest;
use App\Http\Requests\User\UpdateDocumentoRequest;
use App\Models\Area;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\Remitente;
use App\Services\OcrService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DocumentoController extends Controller
{
    public function __construct(private readonly OcrService $ocrService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user?->rol === 'admin';
        $perPage = (int) $request->integer('per_page', 5);

        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        $filters = [
            'palabra_clave' => $request->string('palabra_clave')->toString(),
            'texto_ocr' => $request->string('texto_ocr')->toString(),
            'remitente_id' => $request->string('remitente_id')->toString(),
            'tipo' => $request->string('tipo')->toString(),
            'recibido' => $request->string('recibido')->toString(),
            'fecha_desde' => $request->string('fecha_desde')->toString(),
            'fecha_hasta' => $request->string('fecha_hasta')->toString(),
            'con_ocr' => $request->boolean('con_ocr'),
            'per_page' => (string) $perPage,
        ];

        $documentos = Documento::query()
            ->with([
                'remitente:id_remitente,nombre',
                'user:id_user,nombre,apellido,area_id',
                'user.area:id_area,nombre',
            ])
            ->when(! $isAdmin, function (Builder $query) use ($user): void {
                $query->where(function (Builder $visibilityQuery) use ($user): void {
                    $visibilityQuery
                        ->where('user_id', $user->id_user)
                        ->orWhere('area_actual_id', $user->area_id);
                });
            })
            ->when($filters['palabra_clave'] !== '', fn (Builder $query) => $query->where('palabra_clave', 'like', "%{$filters['palabra_clave']}%"))
            ->when($filters['texto_ocr'] !== '', fn (Builder $query) => $query->where('contenido_ocr', 'like', "%{$filters['texto_ocr']}%"))
            ->when($filters['remitente_id'] !== '', fn (Builder $query) => $query->where('remitente_id', $filters['remitente_id']))
            ->when($filters['tipo'] !== '', fn (Builder $query) => $query->where('tipo', $filters['tipo']))
            ->when($filters['recibido'] !== '', fn (Builder $query) => $query->where('recibido', $filters['recibido']))
            ->when($filters['fecha_desde'] !== '', fn (Builder $query) => $query->whereDate('fecha_oficio', '>=', $filters['fecha_desde']))
            ->when($filters['fecha_hasta'] !== '', fn (Builder $query) => $query->whereDate('fecha_oficio', '<=', $filters['fecha_hasta']))
            ->when($filters['con_ocr'], fn (Builder $query) => $query->whereNotNull('contenido_ocr'))
            ->latest('id_documento')
            ->paginate($perPage, [
                'id_documento',
                'numero_oficio',
                'fecha_oficio',
                'remitente_id',
                'tipo',
                'palabra_clave',
                'archivo',
                'recibido',
                'user_id',
                'created_at',
            ])
            ->withQueryString();

        return Inertia::render('user/documentos/index', [
            'documentos' => $documentos,
            'filters' => $filters,
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('nombre')
                ->get(['id_remitente', 'nombre']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('user/documentos/create', [
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('nombre')
                ->get(['id_remitente', 'nombre']),
            'tipos' => ['interno', 'externo'],
        ]);
    }

    public function edit(Request $request, int $documento): Response
    {
        $documento = Documento::query()
            ->with([
                'area:id_area,nombre',
                'remitente:id_remitente,nombre',
            ])
            ->findOrFail($documento);

        $this->ensureCanManageDocumento($request, $documento);

        return Inertia::render('user/documentos/edit', [
            'documento' => [
                'id_documento' => $documento->id_documento,
                'numero_oficio' => $documento->numero_oficio,
                'fecha_oficio' => $documento->fecha_oficio !== null
                    ? substr((string) $documento->fecha_oficio, 0, 10)
                    : null,
                'remitente_id' => $documento->remitente_id,
                'tipo' => $documento->tipo,
                'palabra_clave' => $documento->palabra_clave,
                'archivo' => $documento->archivo,
                'recibido' => $documento->recibido,
            ],
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('nombre')
                ->get(['id_remitente', 'nombre']),
            'tipos' => ['interno', 'externo'],
        ]);
    }

    public function show(Request $request, int $documento): Response
    {
        $user = $request->user();

        $documento = Documento::query()
            ->with([
                'area:id_area,nombre',
                'remitente:id_remitente,nombre',
                'user:id_user,nombre,apellido',
            ])
            ->findOrFail($documento);

        $this->ensureCanManageDocumento($request, $documento);

        $movimientos = Movimiento::query()
            ->with([
                'deArea:id_area,nombre',
                'aArea:id_area,nombre',
                'remitente:id_user,nombre,apellido',
            ])
            ->where('documento_id', $documento->id_documento)
            ->orderByDesc('fecha_envio')
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

        return Inertia::render('user/documentos/show', [
            'documento' => $documento,
            'areas' => Area::query()
                ->where('id_area', '!=', $documento->area_actual_id)
                ->orderBy('nombre')
                ->get(['id_area', 'nombre']),
            'movimientos' => $movimientos,
            'canEnviar' => $user !== null && $user->rol === 'user' && $user->area_id === $documento->area_actual_id,
            'userAreaId' => $user?->area_id,
        ]);
    }

    public function update(UpdateDocumentoRequest $request, int $documento): RedirectResponse
    {
        $documento = Documento::query()->findOrFail($documento);

        $this->ensureCanManageDocumento($request, $documento);

        $data = $request->safe()->except(['archivo']);

        if ($request->hasFile('archivo')) {
            $archivoPath = $this->storeArchivoConDocumentoId($request->file('archivo'), $documento);
            $data['archivo'] = $archivoPath;
            // Never keep stale OCR from a previous file when replacing the document.
            $data['contenido_ocr'] = null;

            try {
                $ocrText = $this->ocrService->extractText(storage_path('app/public/'.$archivoPath));

                $data['contenido_ocr'] = $ocrText !== '' ? $ocrText : null;
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        $documento->update($data);

        return to_route('user.documentos.show', $documento->id_documento);
    }

    public function store(StoreDocumentoRequest $request): RedirectResponse
    {
        $user = $request->user();

        $documento = Documento::create([
            ...$request->safe()->except(['archivo', 'recibido']),
            'archivo' => 'documentos/tmp/'.$request->file('archivo')->hashName(),
            'user_id' => $user->id_user,
            'area_actual_id' => $user->area_id,
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

        return to_route('user.documentos.index');
    }

    public function destroy(Request $request, int $documento): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null && $user->rol === 'user', 403);

        $documento = Documento::query()
            ->where('user_id', $user->id_user)
            ->findOrFail($documento);

        $documento->delete();

        return to_route('user.documentos.index')->with('success', 'El oficio fue eliminado correctamente.');
    }

    public function deletedIndex(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 5);

        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        $filters = [
            'palabra_clave' => $request->string('palabra_clave')->toString(),
            'remitente_id' => $request->string('remitente_id')->toString(),
            'tipo' => $request->string('tipo')->toString(),
            'recibido' => $request->string('recibido')->toString(),
            'per_page' => (string) $perPage,
        ];

        $documentos = Documento::onlyTrashed()
            ->with([
                'remitente:id_remitente,nombre',
                'user:id_user,nombre,apellido,area_id',
                'user.area:id_area,nombre',
            ])
            ->when($filters['palabra_clave'] !== '', fn (Builder $query) => $query->where('palabra_clave', 'like', "%{$filters['palabra_clave']}%"))
            ->when($filters['remitente_id'] !== '', fn (Builder $query) => $query->where('remitente_id', $filters['remitente_id']))
            ->when($filters['tipo'] !== '', fn (Builder $query) => $query->where('tipo', $filters['tipo']))
            ->when($filters['recibido'] !== '', fn (Builder $query) => $query->where('recibido', $filters['recibido']))
            ->latest('deleted_at')
            ->paginate($perPage, [
                'id_documento',
                'numero_oficio',
                'fecha_oficio',
                'remitente_id',
                'tipo',
                'palabra_clave',
                'recibido',
                'user_id',
                'deleted_at',
            ])
            ->withQueryString();

        return Inertia::render('admin/documentos/eliminados', [
            'documentos' => $documentos,
            'filters' => $filters,
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('nombre')
                ->get(['id_remitente', 'nombre']),
        ]);
    }

    public function restore(Request $request, int $documento): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null && $user->rol === 'admin', 403);

        $documento = Documento::onlyTrashed()->findOrFail($documento);

        $documento->restore();

        return to_route('admin.documentos.deleted')->with('success', 'El oficio fue restaurado correctamente.');
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

    private function ensureCanManageDocumento(Request $request, Documento $documento): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null
            && (
                $user->rol === 'admin'
                || $documento->user_id === $user->id_user
                || $documento->area_actual_id === $user->area_id
            ),
            403
        );
    }
}
