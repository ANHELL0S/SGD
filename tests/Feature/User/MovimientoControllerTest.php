<?php

use App\Events\DocumentoMovimientoActualizado;
use App\Http\Controllers\User\MovimientoController;
use App\Models\Area;
use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\Remitente;
use App\Models\User;
use App\Services\OcrService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
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
            ->has('motivos', 1)
            ->where('motivos.0.total_movimientos', 3)
            ->where('motivos.0.movimientos', fn ($movimientos) => collect($movimientos)->pluck('id_movimiento')->contains($movimientoRespuesta->id_movimiento)
                && collect($movimientos)->pluck('id_movimiento')->contains($movimientoSalida->id_movimiento))
            ->where('resumen.total', 3)
            ->where('resumen.motivos', 1)
            ->where('resumen.salidas', 1)
            ->where('resumen.entradas', 2)
            ->where('resumen.pendientes', 1)
            ->where('resumen.recibidos', 1)
        );
});

test('movimientos index is paginated by motivo groups', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);

    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ENTIDAD EXTERNA',
        'estado' => true,
    ]);

    foreach (range(1, 12) as $indice) {
        $documento = Documento::create([
            'numero_oficio' => 'OF-2026-'.(900 + $indice),
            'fecha_oficio' => '2026-04-05',
            'remitente_id' => $remitente->id_remitente,
            'tipo' => 'externo',
            'palabra_clave' => 'MOTIVO-'.$indice,
            'archivo' => 'documentos/'.(900 + $indice).'.pdf',
            'area_actual_id' => $areaOrigen->id_area,
            'user_id' => $usuario->id_user,
            'recibido' => 'subido',
        ]);

        Movimiento::create([
            'documento_id' => $documento->id_documento,
            'de_area_id' => $areaOrigen->id_area,
            'a_area_id' => $areaDestino->id_area,
            'enviado_por' => $usuario->id_user,
            'comentario' => 'Motivo '.$indice,
            'fecha_envio' => now()->subMinutes($indice),
        ]);
    }

    actingAs($usuario);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->has('motivos', 10)
            ->where('pagination.current_page', 1)
            ->where('pagination.last_page', 2)
            ->where('pagination.per_page', 10)
            ->where('pagination.total', 12)
            ->where('pagination.from', 1)
            ->where('pagination.to', 10)
            ->where('pagination.next_page_url', fn (?string $url) => is_string($url) && str_contains($url, 'page=2'))
        );

    get(route('user.movimientos.index', ['page' => 2]))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->has('motivos', 2)
            ->where('pagination.current_page', 2)
            ->where('pagination.last_page', 2)
            ->where('pagination.total', 12)
            ->where('pagination.from', 11)
            ->where('pagination.to', 12)
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

test('movimientos index only shows incoming movements assigned to the authenticated user', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'SECRETARIA']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestinoA = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $usuarioDestinoB = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ENTIDAD EXTERNA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-990',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ASIGNADO',
        'archivo' => 'documentos/990.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'subido',
    ]);

    $movimientoVisible = Movimiento::create([
        'documento_id' => $documento->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'destinatario_user_id' => $usuarioDestinoA->id_user,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Asignado al usuario A',
        'fecha_envio' => now()->subMinutes(5),
    ]);

    $movimientoOculto = Movimiento::create([
        'documento_id' => $documento->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'destinatario_user_id' => $usuarioDestinoB->id_user,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Asignado al usuario B',
        'fecha_envio' => now()->subMinutes(1),
    ]);

    actingAs($usuarioDestinoA);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->where('motivos.0.movimientos', fn ($movimientos) => collect($movimientos)->pluck('id_movimiento')->contains($movimientoVisible->id_movimiento)
                && ! collect($movimientos)->pluck('id_movimiento')->contains($movimientoOculto->id_movimiento))
        );
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
            ->where('motivos.0.movimientos', fn ($movimientos) => collect($movimientos)->contains(function (array $movimiento) use ($movimientoEntrante): bool {
                return $movimiento['id_movimiento'] === $movimientoEntrante->id_movimiento
                    && $movimiento['respuesta_enviada'] === true
                    && $movimiento['puede_responder'] === false;
            }))
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

    Log::spy();
    Log::shouldReceive('channel')->andReturnSelf();
    Event::fake([DocumentoMovimientoActualizado::class]);

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

    Log::shouldHaveReceived('info')
        ->with('Documento enviado', Mockery::on(function (array $context) use ($movimiento, $documento, $areaOrigen, $areaDestino, $usuario): bool {
            return $context['id_movimiento'] === $movimiento->id_movimiento
                && $context['documento_id'] === $documento->id_documento
                && $context['de_area_id'] === $areaOrigen->id_area
                && $context['a_area_id'] === $areaDestino->id_area
                && $context['enviado_por'] === $usuario->id_user;
        }))
        ->once();

    Event::assertDispatched(DocumentoMovimientoActualizado::class, function (DocumentoMovimientoActualizado $event) use ($movimiento, $documento, $areaOrigen, $areaDestino, $usuario): bool {
        return $event->accion === 'enviado'
            && $event->payload['movimiento']['id_movimiento'] === $movimiento->id_movimiento
            && $event->payload['documento']['id_documento'] === $documento->id_documento
            && $event->payload['areas']['origen']['id_area'] === $areaOrigen->id_area
            && $event->payload['areas']['destino']['id_area'] === $areaDestino->id_area
            && $event->payload['usuario']['id_user'] === $usuario->id_user;
    });
});

test('admin can send documento from another area', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'TICS']);
    $adminArea = Area::create(['nombre' => 'ADMIN']);

    $admin = User::factory()->create([
        'rol' => 'admin',
        'area_id' => $adminArea->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-805',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'ENVIO-ADMIN',
        'archivo' => 'documentos/805.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $admin->id_user,
        'recibido' => 'subido',
    ]);

    actingAs($admin);

    post(route('user.movimientos.store'), [
        'id_documento' => $documento->id_documento,
        'a_area_id' => $areaDestino->id_area,
        'comentario' => 'Enviado por administrador.',
    ])->assertRedirect(route('user.documentos.show', $documento->id_documento));

    $documento->refresh();
    $movimiento = Movimiento::query()->firstOrFail();

    expect($movimiento->documento_id)->toBe($documento->id_documento)
        ->and($movimiento->de_area_id)->toBe($areaOrigen->id_area)
        ->and($movimiento->a_area_id)->toBe($areaDestino->id_area)
        ->and($movimiento->enviado_por)->toBe($admin->id_user)
        ->and($documento->area_actual_id)->toBe($areaDestino->id_area)
        ->and($documento->recibido)->toBe('enviado');
});

test('store logs critical when database transaction fails', function () {
    Log::spy();
    Log::shouldReceive('channel')->andReturnSelf();

    $controller = new MovimientoController(app(OcrService::class));
    $exception = new QueryException('sqlite', 'insert into movimientos (...) values (...)', [], new Exception('DB failure'));

    $method = new ReflectionMethod($controller, 'logDatabaseError');
    $method->setAccessible(true);
    $method->invoke($controller, 'Error de base de datos al enviar documento', $exception, [
        'documento_id' => 801,
        'de_area_id' => 1,
        'a_area_id' => 2,
        'enviado_por' => 3,
    ]);

    Log::shouldHaveReceived('critical')
        ->with('Error de base de datos al enviar documento', Mockery::on(function (array $context): bool {
            return $context['documento_id'] === 801
                && $context['de_area_id'] === 1
                && $context['a_area_id'] === 2
                && $context['enviado_por'] === 3;
        }))
        ->once();
});

test('store forbids document owner when user does not belong to documento current area', function () {
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
        'comentario' => 'Reenvio por propietario.',
    ])->assertRedirect('/');

    expect(Movimiento::query()->count())->toBe(0)
        ->and($documento->fresh()->area_actual_id)->toBe($areaOrigen->id_area)
        ->and($documento->fresh()->recibido)->toBe('subido');
});

test('store rejects forwarding when current custodial area has pending reception', function () {
    $areaOrigen = Area::create(['nombre' => 'LEGAL']);
    $areaCustodia = Area::create(['nombre' => 'TICS']);
    $areaDestino = Area::create(['nombre' => 'ARCHIVO']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioCustodia = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaCustodia->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-811',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'PENDIENTE',
        'archivo' => 'documentos/811.pdf',
        'area_actual_id' => $areaCustodia->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    Movimiento::create([
        'documento_id' => $documento->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaCustodia->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Pendiente de recepcion en TICs.',
        'fecha_envio' => now()->subMinutes(20),
        'fecha_recepcion' => null,
    ]);

    actingAs($usuarioCustodia);

    from(route('user.documentos.show', $documento->id_documento))
        ->post(route('user.movimientos.store'), [
            'id_documento' => $documento->id_documento,
            'a_area_id' => $areaDestino->id_area,
            'comentario' => 'Reenvio desde custodio sin recepcion.',
        ])->assertSessionHasErrors('id_documento');

    expect(Movimiento::query()->count())->toBe(1)
        ->and($documento->fresh()->area_actual_id)->toBe($areaCustodia->id_area)
        ->and($documento->fresh()->recibido)->toBe('enviado');
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

    Log::spy();
    Log::shouldReceive('channel')->andReturnSelf();
    Event::fake([DocumentoMovimientoActualizado::class]);

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
            ->where('resumen.pendientes', 1)
        );

    from(route('user.movimientos.index'))
        ->patch(route('user.movimientos.marcar-recibido', $movimiento->id_movimiento))
        ->assertRedirect(route('user.movimientos.index'));

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('user/movimientos/index')
            ->where('resumen.pendientes', 0)
        );

    $movimiento->refresh();
    $documento->refresh();

    expect($movimiento->fecha_recepcion)->not->toBeNull()
        ->and($documento->recibido)->toBe('recibido');

    Log::shouldHaveReceived('info')
        ->with('Documento recibido', Mockery::on(function (array $context) use ($movimiento, $documento, $areaOrigen, $areaDestino, $usuarioDestino): bool {
            return $context['id_movimiento'] === $movimiento->id_movimiento
                && $context['documento_id'] === $documento->id_documento
                && $context['de_area_id'] === $areaOrigen->id_area
                && $context['a_area_id'] === $areaDestino->id_area
                && $context['recibido_por'] === $usuarioDestino->id_user;
        }))
        ->once();

    Event::assertDispatched(DocumentoMovimientoActualizado::class, function (DocumentoMovimientoActualizado $event) use ($movimiento, $documento, $areaOrigen, $areaDestino, $usuarioDestino): bool {
        return $event->accion === 'recibido'
            && $event->payload['movimiento']['id_movimiento'] === $movimiento->id_movimiento
            && $event->payload['documento']['id_documento'] === $documento->id_documento
            && $event->payload['areas']['origen']['id_area'] === $areaOrigen->id_area
            && $event->payload['areas']['destino']['id_area'] === $areaDestino->id_area
            && $event->payload['usuario']['id_user'] === $usuarioDestino->id_user;
    });
});

test('usuario area destino can create and send a response oficio from movimiento', function () {
    Storage::fake('public');
    Log::spy();
    Log::shouldReceive('channel')->andReturnSelf();
    Event::fake([DocumentoMovimientoActualizado::class]);

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService
    {
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

    $documentoRespuesta->refresh();

    expect($documentoRespuesta->documento_padre_id)->toBe($documentoOriginal->id_documento)
        ->and($documentoRespuesta->movimiento_origen_id)->toBe($movimientoRecibido->id_movimiento)
        ->and($documentoRespuesta->user_id)->toBe($usuarioDestino->id_user)
        ->and($documentoRespuesta->area_creadora_id)->toBe($areaDestino->id_area)
        ->and($documentoRespuesta->area_actual_id)->toBe($areaOrigen->id_area)
        ->and($documentoRespuesta->recibido)->toBe('enviado')
        ->and($documentoRespuesta->contenido_ocr)->toBe('RESPUESTA OCR');

    $movimientoRespuesta = Movimiento::query()
        ->where('documento_id', $documentoRespuesta->id_documento)
        ->firstOrFail();

    expect($movimientoRespuesta->de_area_id)->toBe($areaDestino->id_area)
        ->and($movimientoRespuesta->a_area_id)->toBe($areaOrigen->id_area)
        ->and($movimientoRespuesta->enviado_por)->toBe($usuarioDestino->id_user);

    expect($documentoRespuesta->movimientoOrigen->is($movimientoRecibido))->toBeTrue()
        ->and($movimientoRecibido->documentosGenerados->contains('id_documento', $documentoRespuesta->id_documento))->toBeTrue();

    Log::shouldHaveReceived('info')
        ->with('Documento de respuesta creado', Mockery::on(function (array $context) use ($documentoRespuesta, $usuarioDestino, $areaDestino, $documentoOriginal): bool {
            return $context['id_documento'] === $documentoRespuesta->id_documento
                && $context['user_id'] === $usuarioDestino->id_user
                && $context['area_actual_id'] === $areaDestino->id_area
                && $context['documento_padre_id'] === $documentoOriginal->id_documento;
        }))
        ->once();

    Log::shouldHaveReceived('info')
        ->with('Documento de respuesta enviado', Mockery::on(function (array $context) use ($documentoRespuesta, $movimientoRespuesta, $movimientoRecibido, $usuarioDestino, $areaDestino, $areaOrigen): bool {
            return $context['id_documento'] === $documentoRespuesta->id_documento
                && $context['id_movimiento'] === $movimientoRespuesta->id_movimiento
                && $context['documento_padre_id'] === $movimientoRecibido->documento_id
                && $context['user_id'] === $usuarioDestino->id_user
                && $context['area_actual_id'] === $areaDestino->id_area
                && $context['de_area_id'] === $areaDestino->id_area
                && $context['a_area_id'] === $areaOrigen->id_area;
        }))
        ->once();

    Event::assertDispatched(DocumentoMovimientoActualizado::class, function (DocumentoMovimientoActualizado $event) use ($movimientoRespuesta, $documentoRespuesta, $areaDestino, $areaOrigen, $usuarioDestino): bool {
        return $event->accion === 'respondido'
            && $event->payload['movimiento']['id_movimiento'] === $movimientoRespuesta->id_movimiento
            && $event->payload['documento']['id_documento'] === $documentoRespuesta->id_documento
            && $event->payload['areas']['origen']['id_area'] === $areaDestino->id_area
            && $event->payload['areas']['destino']['id_area'] === $areaOrigen->id_area
            && $event->payload['usuario']['id_user'] === $usuarioDestino->id_user;
    });
});

test('storeRespuesta marks original movimiento as recibido when it was pending', function () {
    Storage::fake('public');
    Log::spy();
    Log::shouldReceive('channel')->andReturnSelf();

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService
    {
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
        'numero_oficio' => 'OF-2026-920',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'ORIGINAL-PENDIENTE',
        'archivo' => 'documentos/920.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $movimientoPendiente = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Seguimiento pendiente.',
        'fecha_envio' => now()->subMinutes(10),
    ]);

    actingAs($usuarioDestino);

    post(route('user.movimientos.responder.store'), [
        'movimiento_id' => $movimientoPendiente->id_movimiento,
        'numero_oficio' => 'OF-2026-921',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA-PENDIENTE',
        'archivo' => UploadedFile::fake()->create('respuesta.pdf', 500, 'application/pdf'),
        'comentario_envio' => 'Seguimiento pendiente.',
    ])->assertRedirect();

    $movimientoPendiente->refresh();
    $documentoOriginal->refresh();

    expect($movimientoPendiente->fecha_recepcion)->not->toBeNull()
        ->and($documentoOriginal->recibido)->toBe('recibido');
});

test('pendingMovimientosCount only clears after replying, not just viewing', function () {
    Storage::fake('public');

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService
    {
        public function extractText(string $absolutePath): string
        {
            return 'RESPUESTA OCR';
        }
    };

    app()->instance(OcrService::class, $ocrService);

    $areaOrigen = Area::create(['nombre' => 'SECRETARIA']);
    $areaDestino = Area::create(['nombre' => 'TALENTO HUMANO']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ALCALDIA',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-980',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'SOLICITUD',
        'archivo' => 'documentos/980.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $movimientoEntrante = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Revisar solicitud.',
        'fecha_envio' => now()->subMinutes(10),
    ]);

    actingAs($usuarioDestino);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 1)
        );

    get(route('user.documentos.show', $documentoOriginal->id_documento))
        ->assertSuccessful();

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 1)
        );

    post(route('user.movimientos.responder.store'), [
        'movimiento_id' => $movimientoEntrante->id_movimiento,
        'numero_oficio' => 'OF-2026-981',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA',
        'archivo' => UploadedFile::fake()->create('respuesta.pdf', 500, 'application/pdf'),
        'comentario_envio' => 'Revisar solicitud.',
    ])->assertRedirect();

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 0)
        );
});

test('pendingMovimientosCount only includes movements addressed to authenticated user within same area', function () {
    $areaOrigen = Area::create(['nombre' => 'MESA DE PARTES']);
    $areaDestino = Area::create(['nombre' => 'SECRETARIA']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestinoA = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $usuarioDestinoB = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ALCALDIA',
        'estado' => true,
    ]);

    $documento = Documento::create([
        'numero_oficio' => 'OF-2026-995',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'DESTINATARIO-ESPECIFICO',
        'archivo' => 'documentos/995.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    Movimiento::create([
        'documento_id' => $documento->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'destinatario_user_id' => $usuarioDestinoB->id_user,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Atención usuario B.',
        'fecha_envio' => now()->subMinutes(2),
    ]);

    actingAs($usuarioDestinoA);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 0)
        );

    actingAs($usuarioDestinoB);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 1)
        );
});

test('initiator can close conversation only after receiving a response', function () {
    $areaOrigen = Area::create(['nombre' => 'SECRETARIA']);
    $areaDestino = Area::create(['nombre' => 'TALENTO HUMANO']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ALCALDIA',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-990',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'SOLICITUD-CIERRE',
        'archivo' => 'documentos/990.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $documentoOriginal->refresh();

    $movimientoInicial = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Favor revisar.',
        'fecha_envio' => now()->subMinutes(20),
    ]);

    actingAs($usuarioOrigen);

    $documentoRespuesta = Documento::create([
        'numero_oficio' => 'OF-2026-991',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA-CIERRE',
        'archivo' => 'documentos/991.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuarioDestino->id_user,
        'documento_padre_id' => $documentoOriginal->id_documento,
        'hilo_id' => $documentoOriginal->id_documento,
        'recibido' => 'enviado',
    ]);

    $movimientoRespuesta = Movimiento::create([
        'documento_id' => $documentoRespuesta->id_documento,
        'de_area_id' => $areaDestino->id_area,
        'a_area_id' => $areaOrigen->id_area,
        'enviado_por' => $usuarioDestino->id_user,
        'comentario' => 'Favor revisar.',
        'fecha_envio' => now()->subMinutes(5),
    ]);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 1)
        );

    from(route('user.movimientos.index'))
        ->patch(route('user.movimientos.cerrar-conversacion', $movimientoRespuesta->id_movimiento))
        ->assertRedirect(route('user.movimientos.index'));

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('motivos.0.movimientos.0.puede_responder', false)
        );

    $documentoOriginal->refresh();

    expect($documentoOriginal->conversacion_cerrada_at)->not->toBeNull()
        ->and($documentoOriginal->conversacion_cerrada_por_user_id)->toBe($usuarioOrigen->id_user);

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 0)
        );
});

test('non initiator user cannot close conversation', function () {
    $areaOrigen = Area::create(['nombre' => 'SECRETARIA']);
    $areaDestino = Area::create(['nombre' => 'TALENTO HUMANO']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ALCALDIA',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-992',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'SOLICITUD-CIERRE-2',
        'archivo' => 'documentos/992.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $movimientoInicial = Movimiento::create([
        'documento_id' => $documentoOriginal->id_documento,
        'de_area_id' => $areaOrigen->id_area,
        'a_area_id' => $areaDestino->id_area,
        'enviado_por' => $usuarioOrigen->id_user,
        'comentario' => 'Revisar cierre 2.',
        'fecha_envio' => now()->subMinutes(3),
    ]);

    actingAs($usuarioDestino);

    patch(route('user.movimientos.cerrar-conversacion', $movimientoInicial->id_movimiento))
        ->assertStatus(302);

    $documentoOriginal->refresh();

    expect($documentoOriginal->conversacion_cerrada_at)->toBeNull();
});

test('initiator can reactivate a closed conversation and badge appears again', function () {
    $areaOrigen = Area::create(['nombre' => 'SECRETARIA']);
    $areaDestino = Area::create(['nombre' => 'TALENTO HUMANO']);

    $usuarioOrigen = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaOrigen->id_area,
    ]);

    $usuarioDestino = User::factory()->create([
        'rol' => 'user',
        'area_id' => $areaDestino->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ALCALDIA',
        'estado' => true,
    ]);

    $documentoOriginal = Documento::create([
        'numero_oficio' => 'OF-2026-993',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'SOLICITUD-REABRIR',
        'archivo' => 'documentos/993.pdf',
        'area_actual_id' => $areaDestino->id_area,
        'user_id' => $usuarioOrigen->id_user,
        'recibido' => 'enviado',
    ]);

    $documentoRespuesta = Documento::create([
        'numero_oficio' => 'OF-2026-994',
        'fecha_oficio' => '2026-04-05',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'RESPUESTA-REABRIR',
        'archivo' => 'documentos/994.pdf',
        'area_actual_id' => $areaOrigen->id_area,
        'user_id' => $usuarioDestino->id_user,
        'documento_padre_id' => $documentoOriginal->id_documento,
        'hilo_id' => $documentoOriginal->id_documento,
        'recibido' => 'enviado',
    ]);

    $movimientoRespuesta = Movimiento::create([
        'documento_id' => $documentoRespuesta->id_documento,
        'de_area_id' => $areaDestino->id_area,
        'a_area_id' => $areaOrigen->id_area,
        'enviado_por' => $usuarioDestino->id_user,
        'comentario' => 'Reabrir conversacion.',
        'fecha_envio' => now()->subMinutes(5),
    ]);

    actingAs($usuarioOrigen);

    from(route('user.movimientos.index'))
        ->patch(route('user.movimientos.cerrar-conversacion', $movimientoRespuesta->id_movimiento))
        ->assertRedirect(route('user.movimientos.index'));

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 0)
        );

    from(route('user.movimientos.index'))
        ->patch(route('user.movimientos.activar-conversacion', $movimientoRespuesta->id_movimiento))
        ->assertRedirect(route('user.movimientos.index'));

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('motivos.0.movimientos.0.puede_responder', true)
        );

    $documentoOriginal->refresh();

    expect($documentoOriginal->conversacion_cerrada_at)->toBeNull()
        ->and($documentoOriginal->conversacion_cerrada_por_user_id)->toBeNull();

    get(route('user.movimientos.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingMovimientosCount', 1)
        );
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
