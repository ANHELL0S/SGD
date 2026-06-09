<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreDocumentoRequest;
use App\Http\Requests\User\UpdateDocumentoRequest;
use App\Jobs\ProcesarOcrDocumentoJob;
use App\Models\Area;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\Remitente;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
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
 * Gestiona el CRUD completo de oficios (documentos), búsqueda full-text sobre contenido OCR,
 * carga de archivos con renombrado por ID y despacho asíncrono del job de OCR.
 *
 * Los administradores acceden a todos los documentos; los usuarios solo a los propios.
 * La autorización granular se delega a los helpers `ensureCanVer`, `ensureCanEditar`
 * y `ensurePuedeEnviar`.
 */
class DocumentoController extends Controller
{
    public function __construct() {}

    /**
     * Lista los documentos con filtros avanzados: palabra clave, búsqueda FTS sobre OCR,
     * remitente, tipo, estado de recepción, rango de fechas y presencia de OCR.
     *
     * Cuando hay búsqueda FTS, los resultados se ordenan por relevancia (`ts_rank`).
     * Los administradores ven todos los documentos; los usuarios solo los suyos.
     *
     * @param  Request $request Filtros opcionales: `palabra_clave`, `texto_ocr`, `remitente_id`,
     *                          `tipo`, `recibido`, `fecha_desde`, `fecha_hasta`, `con_ocr`, `per_page`.
     * @return Response
     */
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
            'texto_ocr'     => $request->string('texto_ocr')->toString(),
            'remitente_id'  => $request->string('remitente_id')->toString(),
            'tipo'          => $request->string('tipo')->toString(),
            'recibido'      => $request->string('recibido')->toString(),
            'fecha_desde'   => $request->string('fecha_desde')->toString(),
            'fecha_hasta'   => $request->string('fecha_hasta')->toString(),
            'con_ocr'       => $request->boolean('con_ocr'),
            'per_page'      => (string) $perPage,
        ];

        $busquedaFts = $filters['texto_ocr'];

        $selectColumns = [
            'id_documento',
            'numero_oficio',
            'fecha_oficio',
            'remitente_id',
            'tipo',
            'palabra_clave',
            'asunto',
            'archivo',
            'recibido',
            'area_actual_id',
            'area_creadora_id',
            'user_id',
            'created_at',
        ];

        $documentos = Documento::query()
            ->with([
                'remitente:id_remitente,nombre',
                'user:id_user,nombre,apellido,area_id',
                'user.area:id_area,nombre',
            ])
            ->when(! $isAdmin, function (Builder $query) use ($user): void {
                $query->where('user_id', $user->id_user);
            })
            ->when($filters['palabra_clave'] !== '', fn (Builder $query) => $query->whereRaw("unaccent(palabra_clave) ILIKE unaccent(?)", ["%{$filters['palabra_clave']}%"]))
            ->when($busquedaFts !== '', function (Builder $query) use ($busquedaFts): void {
                $query->whereRaw(
                    "search_vector @@ websearch_to_tsquery('pg_catalog.spanish', unaccent(?))",
                    [$busquedaFts],
                );
                // Ordena por relevancia primero; si hay empate, cae al orden por fecha
                $query->orderByRaw(
                    "ts_rank(search_vector, websearch_to_tsquery('pg_catalog.spanish', unaccent(?))) DESC",
                    [$busquedaFts],
                );
            })
            ->when($filters['remitente_id'] !== '', fn (Builder $query) => $query->where('remitente_id', $filters['remitente_id']))
            ->when($filters['tipo'] !== '', fn (Builder $query) => $query->where('tipo', $filters['tipo']))
            ->when($filters['recibido'] !== '', fn (Builder $query) => $query->where('recibido', $filters['recibido']))
            ->when($filters['fecha_desde'] !== '', fn (Builder $query) => $query->whereDate('fecha_oficio', '>=', $filters['fecha_desde']))
            ->when($filters['fecha_hasta'] !== '', fn (Builder $query) => $query->whereDate('fecha_oficio', '<=', $filters['fecha_hasta']))
            ->when($filters['con_ocr'], fn (Builder $query) => $query->whereNotNull('contenido_ocr'))
            ->latest('id_documento')
            ->paginate($perPage, $selectColumns)->onEachSide(0)
            ->withQueryString();

        return Inertia::render('user/documentos/index', [
            'documentos'     => $documentos,
            'filters'        => $filters,
            'busqueda_activa' => $busquedaFts !== '',
            'remitentes'     => Remitente::query()
                ->where('estado', true)
                ->orderBy('id_remitente')
                ->get(['id_remitente', 'nombre']),
        ]);
    }

    /**
     * Muestra el formulario de creación de un nuevo documento.
     *
     * @return Response
     */
    public function create(): Response
    {
        return Inertia::render('user/documentos/create', [
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('id_remitente')
                ->get(['id_remitente', 'nombre']),
            'tipos' => ['interno', 'externo'],
        ]);
    }

    /**
     * Muestra el formulario de edición del documento.
     *
     * Verifica que el usuario tenga permiso de edición antes de renderizar.
     *
     * @param  Request $request
     * @param  int     $documento ID del documento a editar.
     * @return Response
     */
    public function edit(Request $request, int $documento): Response
    {
        $documento = Documento::query()
            ->with([
                'area:id_area,nombre',
                'remitente:id_remitente,nombre',
            ])
            ->findOrFail($documento);

        $this->ensureCanEditar($request, $documento);

        return Inertia::render('user/documentos/edit', [
            'documento' => [
                'id_documento' => $documento->id_documento,
                'numero_oficio' => $documento->numero_oficio,
                'asunto' => $documento->asunto,
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
                ->orderBy('id_remitente')
                ->get(['id_remitente', 'nombre']),
            'tipos' => ['interno', 'externo'],
        ]);
    }

    /**
     * Muestra el detalle del documento con sus movimientos visibles para el usuario.
     *
     * Al visualizar, marca automáticamente como recibido cualquier movimiento pendiente
     * dirigido al área del usuario ({@see autoRecibirMovimientoPendiente}).
     *
     * @param  Request $request
     * @param  int     $documento ID del documento a visualizar.
     * @return Response
     */
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

        $this->ensureCanVer($request, $documento);

        $this->autoRecibirMovimientoPendiente($user, $documento);

        $movimientos = Movimiento::query()
            ->with([
                'deArea:id_area,nombre',
                'aArea:id_area,nombre',
                'remitente:id_user,nombre,apellido',
                'destinatario:id_user,nombre,apellido',
            ])
            ->where('documento_id', $documento->id_documento)
            ->when($user?->rol !== 'admin', function ($query) use ($user): void {
                if ($user === null) {
                    return;
                }

                $query->where(function ($nested) use ($user): void {
                    $nested->where('de_area_id', $user->area_id)
                        ->orWhere(function ($destino) use ($user): void {
                            $destino->where('a_area_id', $user->area_id)
                                ->where(function ($destinatario) use ($user): void {
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
                'es_copia',
                'movimiento_original_id',
            ]);

        return Inertia::render('user/documentos/show', [
            'documento' => $documento,
            'areas' => Area::query()
                ->where('id_area', '!=', $documento->area_actual_id)
                ->orderBy('id_area')
                ->get(['id_area', 'nombre']),
            'usuariosDestino' => User::query()
                ->where('rol', 'user')
                ->where('estado', 'aprobado')
                ->where('habilitado', true)
                ->whereNotNull('area_id')
                ->orderBy('nombre')
                ->orderBy('apellido')
                ->get(['id_user', 'nombre', 'apellido', 'area_id']),
            'movimientos' => $movimientos,
            'canEnviar' => $user !== null
                && $user->rol !== 'consultor'
                && (
                    $user->rol === 'admin'
                    || $user->area_id === $documento->area_actual_id
                ),
            'userAreaId' => $user?->area_id,
            'userId' => $user?->id_user,
        ]);
    }

    /**
     * Marca automáticamente como recibido el movimiento pendiente más reciente
     * dirigido al área del usuario, dentro de una transacción.
     *
     * No hace nada si el usuario no tiene área asignada o no existe movimiento pendiente.
     *
     * @param  User|null $user
     * @param  Documento $documento Documento que se está visualizando.
     * @return void
     */
    private function autoRecibirMovimientoPendiente(?User $user, Documento $documento): void
    {
        if ($user === null || $user->area_id === null) {
            return;
        }

        $movimientoPendiente = Movimiento::query()
            ->where('documento_id', $documento->id_documento)
            ->where('a_area_id', $user->area_id)
            ->where(function ($query) use ($user): void {
                $query->whereNull('destinatario_user_id')
                    ->orWhere('destinatario_user_id', $user->id_user);
            })
            ->whereNull('fecha_recepcion')
            ->orderByDesc('fecha_envio')
            ->orderByDesc('id_movimiento')
            ->first();

        if ($movimientoPendiente === null) {
            return;
        }

        $fechaRecepcion = now();

        try {
            DB::transaction(function () use ($movimientoPendiente, $fechaRecepcion): void {
                $movimientoPendiente->update([
                    'fecha_recepcion' => $fechaRecepcion,
                ]);

                $movimientoPendiente->documento()->update([
                    'recibido' => 'recibido',
                ]);
            });
        } catch (Throwable $exception) {
            $this->logDatabaseError('Error de base de datos al recibir documento al visualizar', $exception, [
                'movimiento_id' => $movimientoPendiente->id_movimiento,
                'documento_id' => $movimientoPendiente->documento_id,
                'de_area_id' => $movimientoPendiente->de_area_id,
                'a_area_id' => $movimientoPendiente->a_area_id,
                'recibido_por' => $user->id_user,
            ]);

            throw $exception;
        }

        $documento->setAttribute('recibido', 'recibido');
    }

    /**
     * Actualiza los datos del documento. Si se sube un nuevo archivo, lo almacena
     * con el ID como nombre, resetea el OCR y despacha el job de extracción.
     *
     * @param  UpdateDocumentoRequest $request  Datos validados del documento.
     * @param  int                   $documento ID del documento a actualizar.
     * @return RedirectResponse
     */
    public function update(UpdateDocumentoRequest $request, int $documento): RedirectResponse
    {
        $documento = Documento::query()->findOrFail($documento);

        $this->ensureCanEditar($request, $documento);

        $data = $request->safe()->except(['archivo']);

        if ($request->hasFile('archivo')) {
            $archivoPath = $this->storeArchivoConDocumentoId($request->file('archivo'), $documento);
            $data['archivo'] = $archivoPath;
            $data['contenido_ocr'] = null;
        }

        try {
            $documento->update($data);
        } catch (QueryException $exception) {
            $this->logDatabaseError('Error de base de datos al actualizar documento', $exception, [
                'id_documento' => $documento->id_documento,
                'user_id' => $documento->user_id,
                'area_actual_id' => $documento->area_actual_id,
            ]);

            throw $exception;
        }

        if (isset($archivoPath)) {
            ProcesarOcrDocumentoJob::dispatch($documento->id_documento, $archivoPath);
        }

        return to_route('user.documentos.show', $documento->id_documento);
    }

    /**
     * Crea un nuevo documento, sube el archivo con nombre basado en el ID generado
     * y despacha el job de OCR asíncrono.
     *
     * El archivo se guarda temporalmente antes de la creación del registro para obtener
     * el hash del nombre; luego se mueve al path definitivo `documentos/{id}.ext`.
     *
     * @param  StoreDocumentoRequest $request Datos validados incluyendo el archivo PDF.
     * @return RedirectResponse
     */
    public function store(StoreDocumentoRequest $request): RedirectResponse
    {
        $user = $request->user();

        try {
            $documento = Documento::create([
                ...$request->safe()->except(['archivo', 'recibido']),
                'archivo' => 'documentos/tmp/'.$request->file('archivo')->hashName(),
                'user_id' => $user->id_user,
                'area_actual_id' => $user->area_id,
                'area_creadora_id' => $user->area_id,
            ]);
        } catch (QueryException $exception) {
            $this->logDatabaseError('Error de base de datos al crear documento', $exception, [
                'user_id' => $user->id_user,
                'area_actual_id' => $user->area_id,
                'numero_oficio' => $request->input('numero_oficio'),
            ]);

            throw $exception;
        }

        Log::channel('documentos')->info('Documento creado', [
            'id_documento' => $documento->id_documento,
            'user_id' => $documento->user_id,
            'area_actual_id' => $documento->area_actual_id,
        ]);

        $archivoPath = $this->storeArchivoConDocumentoId($request->file('archivo'), $documento);

        try {
            $documento->update([
                'archivo' => $archivoPath,
            ]);
        } catch (QueryException $exception) {
            $this->logDatabaseError('Error de base de datos al actualizar archivo de documento', $exception, [
                'id_documento' => $documento->id_documento,
                'user_id' => $documento->user_id,
                'area_actual_id' => $documento->area_actual_id,
                'archivo' => $archivoPath,
            ]);

            throw $exception;
        }

        ProcesarOcrDocumentoJob::dispatch($documento->id_documento, $archivoPath);

        return to_route('user.documentos.index');
    }

    /**
     * Elimina el documento si no tiene movimientos ni documentos hijos asociados.
     *
     * Los usuarios solo pueden eliminar sus propios documentos; el admin puede eliminar cualquiera.
     *
     * @param  Request $request
     * @param  int     $documento ID del documento a eliminar.
     * @return RedirectResponse
     */
    public function destroy(Request $request, int $documento): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null && in_array($user->rol, ['user', 'admin'], true), 403);

        $documento = Documento::query()
            ->when(
                $user->rol === 'user',
                fn (Builder $query) => $query->where('user_id', $user->id_user),
            )
            ->findOrFail($documento);

        $hasDependencies = $documento->movimientos()->exists()
            || $documento->documentosHijos()->exists();

        if ($hasDependencies) {
            $reason = $this->buildDocumentoDeleteReason($documento);

            return back()->withErrors([
                'documento' => $reason,
            ]);
        }

        $documento->delete();

        return to_route('user.documentos.index')->with('success', 'El oficio fue eliminado correctamente.');
    }

    /**
     * Construye el mensaje de error explicando por qué no se puede eliminar el documento.
     *
     * @param  Documento $documento
     * @return string Mensaje legible con las dependencias encontradas.
     */
    private function buildDocumentoDeleteReason(Documento $documento): string
    {
        $reasons = [];

        if ($documento->movimientos()->exists()) {
            $reasons[] = 'movimientos asociados';
        }

        if ($documento->documentosHijos()->exists()) {
            $reasons[] = 'documentos hijos asociados';
        }

        $details = count($reasons) === 1
            ? $reasons[0]
            : implode(' y ', $reasons);

        return "No se puede eliminar este oficio porque tiene {$details}.";
    }

    /**
     * Lista los documentos eliminados (soft deleted) con filtros y paginación. Solo admin.
     *
     * @param  Request $request Filtros opcionales: `palabra_clave`, `remitente_id`, `tipo`, `recibido`, `per_page`.
     * @return Response
     */
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
            ->when($filters['palabra_clave'] !== '', fn (Builder $query) => $query->whereRaw("unaccent(palabra_clave) ILIKE unaccent(?)", ["%{$filters['palabra_clave']}%"]))
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
                'area_creadora_id',
                'user_id',
                'deleted_at',
            ])
            ->withQueryString();

        return Inertia::render('admin/documentos/eliminados', [
            'documentos' => $documentos,
            'filters' => $filters,
            'remitentes' => Remitente::query()
                ->where('estado', true)
                ->orderBy('id_remitente')
                ->get(['id_remitente', 'nombre']),
        ]);
    }

    /**
     * Restaura un documento que fue eliminado con soft delete. Solo admin.
     *
     * @param  Request $request
     * @param  int     $documento ID del documento en la papelera.
     * @return RedirectResponse
     */
    public function restore(Request $request, int $documento): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null && $user->rol === 'admin', 403);

        $documento = Documento::onlyTrashed()->findOrFail($documento);

        $documento->restore();

        return to_route('admin.documentos.deleted')->with('success', 'El oficio fue restaurado correctamente.');
    }

    /**
     * Mueve el archivo subido al path definitivo `documentos/{id}.{ext}` en el disco público.
     *
     * El archivo se guarda primero en `documentos/tmp`, luego se renombra para garantizar
     * que el nombre refleje el ID real del documento.
     *
     * @param  UploadedFile $archivo   Archivo subido por el usuario.
     * @param  Documento    $documento Documento ya persistido cuyo ID se usa como nombre.
     * @return string Path final relativo al disco público.
     */
    private function storeArchivoConDocumentoId(UploadedFile $archivo, Documento $documento): string
    {
        $temporaryPath = $archivo->store('documentos/tmp', 'public');
        $extension = $archivo->getClientOriginalExtension() ?: $archivo->extension() ?: 'pdf';
        $finalPath = 'documentos/'.$documento->id_documento.'.'.$extension;

        Storage::disk('public')->delete($finalPath);
        Storage::disk('public')->move($temporaryPath, $finalPath);

        return $finalPath;
    }

    /**
     * Lanza 403 si el usuario no tiene permiso para ver el documento.
     *
     * Puede ver: admin, consultor, creador del documento, área actual o área creadora.
     *
     * @param  Request   $request
     * @param  Documento $documento
     * @return void
     */
    private function ensureCanVer(Request $request, Documento $documento): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null
            && (
                $user->rol === 'admin'
                || $user->rol === 'consultor'
                || $documento->user_id === $user->id_user
                || $documento->area_actual_id === $user->area_id
                || $documento->area_creadora_id === $user->area_id
            ),
            403
        );
    }

    /**
     * Lanza 403 si el usuario no tiene permiso para editar el documento.
     *
     * Puede editar: admin o el creador del documento.
     *
     * @param  Request   $request
     * @param  Documento $documento
     * @return void
     */
    private function ensureCanEditar(Request $request, Documento $documento): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null
            && (
                $user->rol === 'admin'
                || $documento->user_id === $user->id_user
            ),
            403
        );
    }

    /**
     * Lanza 403 si el usuario no tiene permiso para enviar el documento a otra área.
     *
     * Puede enviar: admin o usuario cuya área coincide con el área actual del documento.
     *
     * @param  Request   $request
     * @param  Documento $documento
     * @return void
     */
    private function ensurePuedeEnviar(Request $request, Documento $documento): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null
            && (
                $user->rol === 'admin'
                || $documento->area_actual_id === $user->area_id
            ),
            403
        );
    }

    /**
     * Registra un error crítico de base de datos en el canal `errores`.
     *
     * @param  string    $message   Descripción del error.
     * @param  Throwable $exception Excepción capturada.
     * @param  array<string, mixed> $context Datos de contexto adicionales.
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
}
