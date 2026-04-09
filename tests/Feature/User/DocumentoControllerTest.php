<?php

use App\Models\Area;
use App\Models\Documento;
use App\Models\Remitente;
use App\Models\User;
use App\Services\OcrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete as deleteRequest;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

uses(RefreshDatabase::class);

test('usuario can open create documento page', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    Remitente::create([
        'nombre' => 'MINISTERIO PUBLICO',
        'estado' => true,
    ]);

    actingAs($usuario);

    get(route('user.documentos.create'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/create')
            ->has('remitentes', 1)
            ->has('tipos', 2));
});

test('store saves documento with authenticated user area and ocr content', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService {
        public function extractText(string $absolutePath): string
        {
            return 'TEXTO OCR DE PRUEBA';
        }
    };

    app()->instance(OcrService::class, $ocrService);

    actingAs($usuario);

    $response = post(route('user.documentos.store'), [
        'numero_oficio' => 'OF-2026-100',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => UploadedFile::fake()->create('oficio.pdf', 500, 'application/pdf'),
    ]);

    $response->assertRedirect(route('user.documentos.index'));

    $documento = Documento::query()->firstOrFail();

    expect($documento->user_id)->toBe($usuario->id_user)
        ->and($documento->area_actual_id)->toBe($usuario->area_id)
        ->and($documento->recibido)->toBe('subido')
        ->and($documento->contenido_ocr)->toBe('TEXTO OCR DE PRUEBA')
        ->and($documento->archivo)->toBe('documentos/'.$documento->id_documento.'.pdf');

    expect(Storage::disk('public')->exists($documento->archivo))->toBeTrue();
});

test('store rejects duplicated numero oficio among active documentos', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    Documento::create([
        'numero_oficio' => 'OF-2026-150',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'PRIMERO',
        'archivo' => 'documentos/1.pdf',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    post(route('user.documentos.store'), [
        'numero_oficio' => 'OF-2026-150',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'DUPLICADO',
        'archivo' => UploadedFile::fake()->create('oficio-duplicado.pdf', 500, 'application/pdf'),
    ])->assertSessionHasErrors('numero_oficio');

    expect(Documento::query()->count())->toBe(1);
});

test('store keeps documento when ocr fails', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'LEGAL']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'DEFENSORIA',
        'estado' => true,
    ]);

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService {
        public function extractText(string $absolutePath): string
        {
            throw new RuntimeException('OCR failure');
        }
    };

    app()->instance(OcrService::class, $ocrService);

    actingAs($usuario);

    post(route('user.documentos.store'), [
        'numero_oficio' => 'OF-2026-101',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'INFORME',
        'recibido' => 'recibido',
        'archivo' => UploadedFile::fake()->create('oficio-2.pdf', 500, 'application/pdf'),
    ])->assertRedirect(route('user.documentos.index'));

    $documento = Documento::query()->firstOrFail();

    expect($documento->contenido_ocr)->toBeNull();
});

test('index filters documentos by remitente and con ocr', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitenteCoincidente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $remitenteNoCoincidente = Remitente::create([
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    Documento::create([
        'numero_oficio' => 'OF-2026-200',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitenteCoincidente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => 'documentos/oficio-200.jpg',
        'contenido_ocr' => 'TEXTO OCR FILTRABLE',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'recibido',
    ]);

    Documento::create([
        'numero_oficio' => 'OF-2026-201',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitenteNoCoincidente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'PLAN',
        'archivo' => 'documentos/oficio-201.jpg',
        'contenido_ocr' => null,
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'enviado',
    ]);

    actingAs($usuario);

    get(route('user.documentos.index', [
        'remitente_id' => $remitenteCoincidente->id_remitente,
        'con_ocr' => 1,
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/index')
            ->has('documentos.data', 1)
            ->where('documentos.data.0.id_documento', Documento::query()->where('numero_oficio', 'OF-2026-200')->firstOrFail()->id_documento)
        );
});

test('index filters documentos by palabra clave and texto ocr', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documentoCoincidente = Documento::create([
        'numero_oficio' => 'OF-2026-310',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => 'documentos/oficio-310.jpg',
        'contenido_ocr' => 'HALLAZGO DOCUMENTAL IMPORTANTE',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'recibido',
    ]);

    Documento::create([
        'numero_oficio' => 'OF-2026-311',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'PLAN',
        'archivo' => 'documentos/oficio-311.jpg',
        'contenido_ocr' => 'CONTENIDO DISTINTO',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'recibido',
    ]);

    actingAs($usuario);

    get(route('user.documentos.index', [
        'palabra_clave' => 'AUDITORIA',
        'texto_ocr' => 'HALLAZGO',
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/index')
            ->has('documentos.data', 1)
            ->where('documentos.data.0.id_documento', $documentoCoincidente->id_documento)
        );
});

test('index filters documentos by fecha oficio range including same day', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documentoDelDiaFiltrado = Documento::create([
        'numero_oficio' => 'OF-2026-401',
        'fecha_oficio' => '2026-04-01',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'DEL DIA',
        'archivo' => 'documentos/oficio-401.jpg',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    Documento::create([
        'numero_oficio' => 'OF-2026-402',
        'fecha_oficio' => '2026-04-02',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'OTRO DIA',
        'archivo' => 'documentos/oficio-402.jpg',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    get(route('user.documentos.index', [
        'fecha_desde' => '2026-04-01',
        'fecha_hasta' => '2026-04-01',
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/index')
            ->has('documentos.data', 1)
            ->where('documentos.data.0.id_documento', $documentoDelDiaFiltrado->id_documento)
        );
});

test('index paginates documentos and accepts per_page options', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    foreach (range(1, 8) as $numero) {
        Documento::create([
            'numero_oficio' => 'OF-2026-5'.$numero,
            'fecha_oficio' => '2026-04-0'.(($numero % 8) + 1),
            'remitente_id' => $remitente->id_remitente,
            'tipo' => 'externo',
            'palabra_clave' => 'PAGINACION',
            'archivo' => 'documentos/oficio-5'.$numero.'.jpg',
            'area_actual_id' => $area->id_area,
            'user_id' => $usuario->id_user,
            'recibido' => 'subido',
        ]);
    }

    actingAs($usuario);

    get(route('user.documentos.index', [
        'per_page' => 7,
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/index')
            ->has('documentos.data', 7)
            ->where('documentos.per_page', 7)
            ->where('documentos.total', 8)
            ->where('filters.per_page', '7')
        );
});

test('usuario can view documentos currently assigned to their area', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-315',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'DERIVADO-A-TICS',
        'archivo' => 'documentos/oficio-315.pdf',
        'contenido_ocr' => 'CONTENIDO',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    actingAs($usuarioDestino);

    get(route('user.documentos.index', [
        'recibido' => 'enviado',
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/index')
            ->has('documentos.data', 1)
            ->where('documentos.data.0.id_documento', $documento->id_documento)
        );
});

test('admin can view documentos from any owner in index', function () {
    $areaTics = Area::create(['nombre' => 'TICS']);
    $areaLegal = Area::create(['nombre' => 'LEGAL']);

    $admin = User::factory()->create([
        'rol' => 'admin',
        'area_id' => $areaLegal->id_area,
    ]);

    $usuarioTics = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaTics->id_area,
        'nombre' => 'Carlos',
        'apellido' => 'Tics',
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-320',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => 'documentos/oficio-320.jpg',
        'contenido_ocr' => 'DOCUMENTO DE TICS',
        'area_actual_id' => $areaTics->id_area,
        'user_id' => $usuarioTics->id_user,
        'recibido' => 'recibido',
    ]);

    actingAs($admin);

    get(route('user.documentos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/index')
            ->has('documentos.data', 1)
            ->where('documentos.data.0.id_documento', $documento->id_documento)
            ->where('documentos.data.0.user.nombre', 'Carlos')
            ->where('documentos.data.0.user.area.nombre', 'TICS')
        );
});

test('admin cannot access create or store documento actions', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'ADMINISTRACION']);
    $admin = User::factory()->create([
        'rol' => 'admin',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    actingAs($admin);

    get(route('user.documentos.create'))->assertForbidden();

    post(route('user.documentos.store'), [
        'numero_oficio' => 'OF-2026-321',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'BLOQUEADO',
        'archivo' => UploadedFile::fake()->create('oficio-admin.pdf', 500, 'application/pdf'),
    ])->assertForbidden();
});

test('usuario can view documento detail page with ocr content and file information', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-300',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'SUPERVISION',
        'archivo' => 'documentos/oficio-300.jpg',
        'contenido_ocr' => 'TEXTO OCR DEL OFICIO',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'recibido',
    ]);

    actingAs($usuario);

    get(route('user.documentos.show', $documento->id_documento))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/show')
            ->where('documento.id_documento', $documento->id_documento)
            ->where('documento.contenido_ocr', 'TEXTO OCR DEL OFICIO')
            ->where('documento.remitente.nombre', 'CONTRALORIA')
        );
});

test('usuario cannot view documento detail from another area', function () {
    $areaUsuario = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDocumento = Area::create(['nombre' => 'TICS']);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaUsuario->id_area,
    ]);
    $otroUsuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDocumento->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-301',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => 'documentos/oficio-301.jpg',
        'contenido_ocr' => 'OTRO TEXTO OCR',
        'area_actual_id' => $areaDocumento->id_area,
        'user_id' => $otroUsuario->id_user,
        'recibido' => 'recibido',
    ]);

    actingAs($usuario);

    get(route('user.documentos.show', $documento->id_documento))
        ->assertForbidden();
});

test('admin can view and edit another users documento', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $adminArea = Area::create(['nombre' => 'ADMIN']);

    $admin = User::factory()->create([
        'rol' => 'admin',
        'area_id' => $adminArea->id_area,
    ]);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-399',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ADMIN-EDIT',
        'archivo' => 'documentos/oficio-399.jpg',
        'contenido_ocr' => 'OCR',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($admin);

    get(route('user.documentos.show', $documento->id_documento))
        ->assertSuccessful();

    patch(route('user.documentos.update', $documento->id_documento), [
        'numero_oficio' => 'OF-2026-399-ADMIN',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'EDITADO-ADMIN',
    ])->assertRedirect(route('user.documentos.show', $documento->id_documento));

    $documento->refresh();

    expect($documento->numero_oficio)->toBe('OF-2026-399-ADMIN')
        ->and($documento->tipo)->toBe('interno')
        ->and($documento->palabra_clave)->toBe('EDITADO-ADMIN');
});

test('usuario can soft delete own documento', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-700',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ELIMINABLE',
        'archivo' => 'documentos/oficio-700.jpg',
        'contenido_ocr' => 'OCR',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    deleteRequest(route('user.documentos.destroy', $documento->id_documento))
        ->assertRedirect(route('user.documentos.index'));

    expect(Documento::query()->whereKey($documento->id_documento)->exists())->toBeFalse()
        ->and(Documento::onlyTrashed()->whereKey($documento->id_documento)->exists())->toBeTrue();
});

test('usuario cannot soft delete another users documento', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);
    $otroUsuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-701',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'NO-ELIMINABLE',
        'archivo' => 'documentos/oficio-701.jpg',
        'contenido_ocr' => 'OCR',
        'area_actual_id' => $area->id_area,
        'user_id' => $otroUsuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    deleteRequest(route('user.documentos.destroy', $documento->id_documento))
        ->assertNotFound();

    expect(Documento::query()->whereKey($documento->id_documento)->exists())->toBeTrue();
});

test('admin can view deleted documentos and restore them', function () {
    $area = Area::create(['nombre' => 'TICS']);
    $adminArea = Area::create(['nombre' => 'ADMIN']);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
        'nombre' => 'Usuario',
        'apellido' => 'Tics',
    ]);

    $admin = User::factory()->create([
        'rol' => 'admin',
        'area_id' => $adminArea->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-702',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RECUPERABLE',
        'archivo' => 'documentos/oficio-702.jpg',
        'contenido_ocr' => 'OCR',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'en_revision',
    ]);

    actingAs($usuario);
    deleteRequest(route('user.documentos.destroy', $documento->id_documento))->assertRedirect();

    expect(Documento::onlyTrashed()->whereKey($documento->id_documento)->exists())->toBeTrue();

    actingAs($admin);

    get(route('admin.documentos.deleted'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/documentos/eliminados')
            ->has('documentos.data', 1)
            ->where('documentos.data.0.id_documento', $documento->id_documento)
            ->where('documentos.data.0.user.nombre', 'Usuario')
            ->where('documentos.data.0.user.area.nombre', 'TICS')
        );

    patch(route('admin.documentos.restore', $documento->id_documento))
        ->assertRedirect(route('admin.documentos.deleted'));

    expect(Documento::onlyTrashed()->whereKey($documento->id_documento)->exists())->toBeFalse()
        ->and(Documento::query()->whereKey($documento->id_documento)->exists())->toBeTrue();
});

test('usuario can open documento edit page', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-400',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'REVISAR',
        'archivo' => 'documentos/oficio-400.jpg',
        'contenido_ocr' => 'OCR',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    get(route('user.documentos.edit', $documento->id_documento))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/documentos/edit')
            ->where('documento.id_documento', $documento->id_documento)
            ->has('remitentes', 1)
            ->has('tipos', 2)
        );
});

test('usuario can update documento without replacing file', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-401',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ORIGINAL',
        'archivo' => 'documentos/oficio-401.jpg',
        'contenido_ocr' => 'OCR ORIGINAL',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    patch(route('user.documentos.update', $documento->id_documento), [
        'numero_oficio' => 'OF-2026-401-A',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'ACTUALIZADO',
    ])->assertRedirect(route('user.documentos.show', $documento->id_documento));

    $documento->refresh();

    expect($documento->numero_oficio)->toBe('OF-2026-401-A')
        ->and($documento->tipo)->toBe('interno')
        ->and($documento->recibido)->toBe('subido')
        ->and($documento->archivo)->toBe('documentos/oficio-401.jpg');
});

test('replacing file clears previous ocr when new ocr extraction fails', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-402',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ORIGINAL',
        'archivo' => 'documentos/oficio-402.jpg',
        'contenido_ocr' => 'OCR ANTERIOR',
        'area_actual_id' => $area->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService {
        public function extractText(string $absolutePath): string
        {
            throw new RuntimeException('OCR update failure');
        }
    };

    app()->instance(OcrService::class, $ocrService);

    actingAs($usuario);

    post(route('user.documentos.update', $documento->id_documento), [
        '_method' => 'PATCH',
        'numero_oficio' => 'OF-2026-402',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ORIGINAL',
        'archivo' => UploadedFile::fake()->create('oficio-402-new.pdf', 500, 'application/pdf'),
    ])->assertRedirect(route('user.documentos.show', $documento->id_documento));

    $documento->refresh();

    expect($documento->archivo)->not->toBe('documentos/oficio-402.jpg')
        ->and($documento->contenido_ocr)->toBeNull();
});

test('store rejects non pdf file uploads', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    actingAs($usuario);

    post(route('user.documentos.store'), [
        'numero_oficio' => 'OF-2026-500',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => UploadedFile::fake()->image('oficio.png'),
    ])->assertSessionHasErrors('archivo');

    expect(Documento::query()->count())->toBe(0);
});

test('store rejects pdf files larger than 4mb', function () {
    Storage::fake('public');

    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    actingAs($usuario);

    post(route('user.documentos.store'), [
        'numero_oficio' => 'OF-2026-501',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => UploadedFile::fake()->create('oficio-grande.pdf', 5000, 'application/pdf'),
    ])->assertSessionHasErrors('archivo');

    expect(Documento::query()->count())->toBe(0);
});
