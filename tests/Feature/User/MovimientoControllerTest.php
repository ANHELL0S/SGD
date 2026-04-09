<?php

use App\Models\Area;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\Remitente;
use App\Models\User;
use App\Services\OcrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\from;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

uses(RefreshDatabase::class);

test('user can view movimientos index limited to their area', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);
    $areaExterna = Area::create(['nombre' => 'ARCHIVO']);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioExterno = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaExterna->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documentoMotivoCompartido = Documento::create([
        'numero_oficio' => 'OF-2026-700',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'SALIDA',
        'archivo' => 'documentos/700.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    $movimientoSalida = Movimiento::create([
        'documento_id' => $documentoMotivoCompartido->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuario->id_user,
        'comentario' => 'Seguimiento de contrato.',
        'fecha_envio' => now()->subMinutes(15),
    ]);

    $documentoRespuesta = Documento::create([
        'numero_oficio' => 'OF-2026-701',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA',
        'archivo' => 'documentos/701.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuarioExterno->id_user,
        'recibido' => 'recibido',
        'documento_padre_id' => $documentoMotivoCompartido->id_documento,
    ]);

    $movimientoRespuesta = Movimiento::create([
        'documento_id' => $documentoRespuesta->id_documento,
        'de_area_id' => $areaExterna->id_area,
        'a_area_id' => $areaOrigen->id_area,
        'enviado_por' => $usuarioExterno->id_user,
        'comentario' => 'Seguimiento de contrato.',
        'fecha_envio' => now()->subMinutes(5),
        'fecha_recepcion' => now()->subMinutes(1),
    ]);

    Movimiento::create([
        'documento_id' => $documentoMotivoCompartido->id_documento,
        'de_area_id' => $areaExterna->id_area,
        'a_area_id' => $areaOrigen->id_area,
        'enviado_por' => $usuarioExterno->id_user,
        'comentario' => 'Otro motivo independiente.',
        'fecha_envio' => now()->subHours(2),
    ]);

    actingAs($usuario);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->has('motivos', 2)
            ->where('motivos.0.motivo', 'Seguimiento de contrato.')
            ->where('motivos.0.total_movimientos', 2)
            ->where('motivos.0.movimientos.0.id_movimiento', $movimientoRespuesta->id_movimiento)
            ->where('motivos.0.movimientos.1.id_movimiento', $movimientoSalida->id_movimiento)
            ->where('motivos.0.movimientos.0.documento.padre.id_documento', $documentoMotivoCompartido->id_documento)
            ->where('motivos.0.movimientos.0.documento.padre.numero_oficio', 'OF-2026-700')
            ->where('motivos.1.motivo', 'Otro motivo independiente.')
            ->where('resumen.total', 3)
            ->where('resumen.motivos', 2)
            ->where('resumen.salidas', 1)
            ->where('resumen.entradas', 2)
            ->where('resumen.pendientes', 2)
            ->where('resumen.recibidos', 1)
        );
});

test('store requires comentario to identify the motivo', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-799',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ENVIO',
        'archivo' => 'documentos/799.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    post(route('user.movimientos.store'), [
        'id_documento' => $documento->id_documento,
        'a_area_id' => $areaDestino->id_area,
        'comentario' => '',
    ])->assertSessionHasErrors('comentario');

    expect(Movimiento::query()->count())->toBe(0);
});

test('movimiento entrante ya respondido is marked as respuesta enviada and cannot responder again', function () {
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
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-950',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ORIGINAL',
        'archivo' => 'documentos/950.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $movimientoEntrante = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Mismo motivo',
        'fecha_envio' => now()->subMinutes(15),
    ]);

    $documentoRespuesta = Documento::create([
        'numero_oficio' => 'OF-2026-951',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA',
        'archivo' => 'documentos/951.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuarioDestino->id_user,
        'recibido' => 'enviado',
        'documento_padre_id' => $documentoOriginal->id_documento,
    ]);

    Movimiento::create([
        'documento_id' => $documentoRespuesta->id_documento,
        'de_area_id' => $areaDestino->id_area,
        'a_area_id' => $areaOrigen->id_area,
        'enviado_por' => $usuarioDestino->id_user,
        'comentario' => 'Mismo motivo',
        'fecha_envio' => now()->subMinutes(5),
    ]);

    actingAs($usuarioDestino);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->where('motivos.0.movimientos.1.id_movimiento', $movimientoEntrante->id_movimiento)
            ->where('motivos.0.movimientos.1.respuesta_enviada', true)
            ->where('motivos.0.movimientos.1.puede_responder', false)
        );
});

test('movimiento entrante ya respondido con otro comentario still cannot responder again', function () {
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
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-952',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ORIGINAL-2',
        'archivo' => 'documentos/952.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $movimientoEntrante = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Solicitud original',
        'fecha_envio' => now()->subMinutes(20),
    ]);

    $documentoRespuesta = Documento::create([
        'numero_oficio' => 'OF-2026-953',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA-2',
        'archivo' => 'documentos/953.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuarioDestino->id_user,
        'recibido' => 'enviado',
        'documento_padre_id' => $documentoOriginal->id_documento,
    ]);

    Movimiento::create([
        'documento_id' => $documentoRespuesta->id_documento,
        'de_area_id' => $areaDestino->id_area,
        'a_area_id' => $areaOrigen->id_area,
        'enviado_por' => $usuarioDestino->id_user,
        'comentario' => 'Comentario diferente al original',
        'fecha_envio' => now()->subMinutes(5),
    ]);

    actingAs($usuarioDestino);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->where('motivos.1.movimientos.0.id_movimiento', $movimientoEntrante->id_movimiento)
            ->where('motivos.1.movimientos.0.respuesta_enviada', true)
            ->where('motivos.1.movimientos.0.puede_responder', false)
        );
});

test('store creates movimiento and updates documento area and status to enviado', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-800',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ENVIO',
        'archivo' => 'documentos/800.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    post(route('user.movimientos.store'), [
        'id_documento' => $documento->id_documento,
        'a_area_id' => $areaDestino->id_area,
        'comentario' => 'Se remite para revision.',
    ])->assertRedirect(route('user.documentos.show', $documento->id_documento));

    $documento->refresh();
    $movimiento = Movimiento::query()->firstOrFail();

    expect($movimiento->documento_id)->toBe($documento->id_documento)
        ->and($movimiento->de_area_id)->toBe($areaOrigen->id_area)
        ->and($movimiento->a_area_id)->toBe($areaDestino->id_area)
        ->and($movimiento->enviado_por)->toBe($usuario->id_user)
        ->and($movimiento->fecha_envio)->not->toBeNull()
        ->and($documento->area_actual_id)->toBe($areaDestino->id_area)
        ->and($documento->recibido)->toBe('enviado');
});

test('store is forbidden when user does not belong to documento current area', function () {
    $areaOrigen = Area::create(['nombre' => 'LEGAL']);
    $areaDestino = Area::create(['nombre' => 'TICS']);
    $areaUsuario = Area::create(['nombre' => 'ADMIN']);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaUsuario->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-801',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ENVIO',
        'archivo' => 'documentos/801.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuario->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($usuario);

    post(route('user.movimientos.store'), [
        'id_documento' => $documento->id_documento,
        'a_area_id' => $areaDestino->id_area,
        'comentario' => 'Intento no autorizado.',
    ])->assertForbidden();

    expect(Movimiento::query()->count())->toBe(0)
        ->and($documento->fresh()->area_actual_id)->toBe($areaOrigen->id_area)
        ->and($documento->fresh()->recibido)->toBe('subido');
});

test('marcarRecibido updates fecha recepcion and documento status', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-802',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RECEPCION',
        'archivo' => 'documentos/802.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $movimiento = Movimiento::create([
        'documento_id' => $documento->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Derivacion inicial.',
        'fecha_envio' => now()->subMinutes(5),
    ]);

    actingAs($usuarioDestino);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->where('pendingMovimientosCount', 1)
        );

    from(route('user.movimientos.index'))
        ->patch(route('user.movimientos.marcar-recibido', $movimiento->id_movimiento))
        ->assertRedirect(route('user.movimientos.index'));

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->where('pendingMovimientosCount', 0)
        );

    $movimiento->refresh();
    $documento->refresh();

    expect($movimiento->fecha_recepcion)->not->toBeNull()
        ->and($documento->recibido)->toBe('recibido');
});

test('usuario area destino can create and send a response oficio from movimiento', function () {
    Storage::fake('public');

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService {
        public function extractText(string $absolutePath): string
        {
            return 'RESPUESTA OCR';
        }
    };

    app()->instance(OcrService::class, $ocrService);

    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-900',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'ORIGINAL',
        'archivo' => 'documentos/900.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'recibido',
    ]);

    $movimientoRecibido = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Seguimiento de contrato.',
        'fecha_envio' => now()->subMinutes(10),
        'fecha_recepcion' => now()->subMinutes(5),
    ]);

    actingAs($usuarioDestino);

    get(route('user.movimientos.responder', $movimientoRecibido->id_movimiento))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('user/documentos/responder'));

    post(route('user.movimientos.responder.store'), [
        'movimiento_id' => $movimientoRecibido->id_movimiento,
        'numero_oficio' => 'OF-2026-901',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA',
        'archivo' => UploadedFile::fake()->create('respuesta.pdf', 500, 'application/pdf'),
        'comentario_envio' => 'Seguimiento de contrato.',
    ])->assertRedirect();

    $documentoRespuesta = Documento::query()->where('numero_oficio', 'OF-2026-901')->firstOrFail();

    expect($documentoRespuesta->documento_padre_id)->toBe($documentoOriginal->id_documento)
        ->and($documentoRespuesta->user_id)->toBe($usuarioDestino->id_user)
        ->and($documentoRespuesta->area_actual_id)->toBe($areaOrigen->id_area)
        ->and($documentoRespuesta->recibido)->toBe('enviado')
        ->and($documentoRespuesta->contenido_ocr)->toBe('RESPUESTA OCR');

    $movimientoRespuesta = Movimiento::query()
        ->where('documento_id', $documentoRespuesta->id_documento)
        ->firstOrFail();

    expect($movimientoRespuesta->de_area_id)->toBe($areaDestino->id_area)
        ->and($movimientoRespuesta->a_area_id)->toBe($areaOrigen->id_area)
        ->and($movimientoRespuesta->enviado_por)->toBe($usuarioDestino->id_user);
});

test('storeRespuesta requires comentario_envio to identify the motivo', function () {
    Storage::fake('public');

    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'SUNAT',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-902',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'ORIGINAL',
        'archivo' => 'documentos/902.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'recibido',
    ]);

    $movimientoRecibido = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Seguimiento de contrato.',
        'fecha_envio' => now()->subMinutes(10),
        'fecha_recepcion' => now()->subMinutes(5),
    ]);

    actingAs($usuarioDestino);

    post(route('user.movimientos.responder.store'), [
        'movimiento_id' => $movimientoRecibido->id_movimiento,
        'numero_oficio' => 'OF-2026-903',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA',
        'archivo' => UploadedFile::fake()->create('respuesta.pdf', 500, 'application/pdf'),
        'comentario_envio' => '',
    ])->assertSessionHasErrors('comentario_envio');

    expect(Documento::query()->where('numero_oficio', 'OF-2026-903')->count())->toBe(0);
});
