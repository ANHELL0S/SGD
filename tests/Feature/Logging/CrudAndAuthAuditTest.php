<?php

use App\Models\Area;
use App\Models\Documento;
use App\Models\LogSistema;
use App\Models\Remitente;
use App\Models\User;
use App\Services\OcrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

uses(RefreshDatabase::class);

function latestAuditByMessage(string $message): ?LogSistema
{
    return LogSistema::query()
        ->where('mensaje', $message)
        ->orderByDesc('id_log')
        ->first();
}

function latestAuditByMessageAndTable(string $message, string $table): ?LogSistema
{
    return LogSistema::query()
        ->where('mensaje', $message)
        ->whereJsonContains('contexto->tabla', $table)
        ->orderByDesc('id_log')
        ->first();
}

test('admin user creation stores audit log with request ip', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $area = Area::query()->create(['nombre' => 'ARCHIVO']);

    actingAs($admin);

    $response = post(route('admin.usuarios.store'), [
        'nombre' => 'Carlos',
        'apellido' => 'Perez',
        'cedula' => '1234567890',
        'area_id' => $area->id_area,
        'rol' => 'user',
        'email' => 'audit-register@example.com',
        'password' => 'Clave123@',
        'password_confirmation' => 'Clave123@',
    ]);

    $response->assertRedirect(route('admin.usuarios.show', ['user' => User::query()->where('email', 'audit-register@example.com')->firstOrFail()]));

    $log = latestAuditByMessage('Usuario creado');

    expect($log)->not->toBeNull()
        ->and($log?->contexto)->toBeArray()
        ->and(Arr::get($log?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and(Arr::get($log?->contexto, 'ip_cliente'))->toBe('127.0.0.1')
        ->and(Arr::get($log?->contexto, 'ip_proxy'))->toBe('127.0.0.1')
        ->and(Arr::get($log?->contexto, 'user_id'))->toBe($admin->id_user);
});

test('documento crud actions are audited with actor and ip', function () {
    $area = Area::create(['nombre' => 'MESA DE PARTES']);
    $usuario = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'CONTRALORIA',
        'estado' => true,
    ]);

    $ocrService = new class('/usr/bin/tesseract', 'spa', 300, 300) extends OcrService
    {
        public function extractText(string $absolutePath): string
        {
            return '';
        }
    };

    app()->instance(OcrService::class, $ocrService);

    actingAs($usuario);

    post(route('user.documentos.store'), [
        'numero_oficio' => 'OF-AUD-001',
        'fecha_oficio' => '2026-04-11',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'AUDITORIA',
        'archivo' => UploadedFile::fake()->create('oficio-audit.pdf', 200, 'application/pdf'),
    ])->assertRedirect(route('user.documentos.index'));

    $documento = Documento::query()->where('numero_oficio', 'OF-AUD-001')->firstOrFail();

    patch(route('user.documentos.update', $documento->id_documento), [
        'numero_oficio' => 'OF-AUD-001',
        'fecha_oficio' => '2026-04-12',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'interno',
        'palabra_clave' => 'AUDITORIA-EDITADA',
    ])->assertRedirect(route('user.documentos.show', $documento->id_documento));

    delete(route('user.documentos.destroy', $documento->id_documento))
        ->assertRedirect(route('user.documentos.index'));

    $createdLog = latestAuditByMessageAndTable('Documento creado', 'documentos');
    $updatedLog = latestAuditByMessageAndTable('Documento actualizado', 'documentos');
    $deletedLog = latestAuditByMessageAndTable('Documento eliminado', 'documentos');

    expect($createdLog?->contexto)->toBeArray()
        ->and($createdLog?->tipo)->toBe('info')
        ->and(Arr::get($createdLog?->contexto, 'registro_id'))->toBe($documento->id_documento)
        ->and(Arr::get($createdLog?->contexto, 'tabla'))->toBe('documentos')
        ->and(Arr::get($createdLog?->contexto, 'user_id'))->toBe($usuario->id_user)
        ->and(Arr::get($createdLog?->contexto, 'ip'))->toBe('127.0.0.1');

    expect($updatedLog?->contexto)->toBeArray()
        ->and($updatedLog?->tipo)->toBe('warning')
        ->and(Arr::get($updatedLog?->contexto, 'registro_id'))->toBe($documento->id_documento)
        ->and(Arr::get($updatedLog?->contexto, 'accion_codigo'))->toBe('updated')
        ->and(Arr::get($updatedLog?->contexto, 'ip'))->toBe('127.0.0.1');

    expect($deletedLog?->contexto)->toBeArray()
        ->and($deletedLog?->tipo)->toBe('warning')
        ->and(Arr::get($deletedLog?->contexto, 'registro_id'))->toBe($documento->id_documento)
        ->and(Arr::get($deletedLog?->contexto, 'accion_codigo'))->toBe('deleted')
        ->and(Arr::get($deletedLog?->contexto, 'ip'))->toBe('127.0.0.1');
});

test('admin area and remitente crud actions are audited with ip', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    actingAs($admin);

    post(route('admin.areas.store'), [
        'nombre' => 'auditoria area',
    ])->assertRedirect(route('admin.areas.index'));

    $area = Area::query()->where('nombre', 'AUDITORIA AREA')->firstOrFail();

    patch(route('admin.areas.update', $area->id_area), [
        'nombre' => 'auditoria area editada',
    ])->assertRedirect(route('admin.areas.index'));

    delete(route('admin.areas.destroy', $area->id_area))
        ->assertRedirect(route('admin.areas.index'));

    post(route('admin.remitentes.store'), [
        'nombre' => 'auditoria remitente 1',
        'estado' => true,
    ])->assertRedirect(route('admin.remitentes.index'));

    $remitente = Remitente::query()->where('nombre', 'AUDITORIA REMITENTE 1')->firstOrFail();

    patch(route('admin.remitentes.update', $remitente->id_remitente), [
        'nombre' => 'auditoria remitente 2',
        'estado' => false,
    ])->assertRedirect(route('admin.remitentes.index'));

    delete(route('admin.remitentes.destroy', $remitente->id_remitente))
        ->assertRedirect(route('admin.remitentes.index'));

    $areaCreated = latestAuditByMessageAndTable('Área creada', 'areas');
    $areaUpdated = latestAuditByMessageAndTable('Área actualizada', 'areas');
    $areaDeleted = latestAuditByMessageAndTable('Área eliminada', 'areas');
    $remitenteCreated = latestAuditByMessageAndTable('Remitente creado', 'remitentes');
    $remitenteUpdated = latestAuditByMessageAndTable('Remitente actualizado', 'remitentes');
    $remitenteDeleted = latestAuditByMessageAndTable('Remitente eliminado', 'remitentes');

    expect(Arr::get($areaCreated?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and($areaCreated?->tipo)->toBe('info')
        ->and(Arr::get($areaUpdated?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and($areaUpdated?->tipo)->toBe('warning')
        ->and(Arr::get($areaDeleted?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and($areaDeleted?->tipo)->toBe('warning')
        ->and(Arr::get($remitenteCreated?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and($remitenteCreated?->tipo)->toBe('info')
        ->and(Arr::get($remitenteUpdated?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and($remitenteUpdated?->tipo)->toBe('warning')
        ->and(Arr::get($remitenteDeleted?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and($remitenteDeleted?->tipo)->toBe('warning');
});

test('admin user actions are audited as user updates with ip', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $pendingUser = User::factory()->create([
        'estado' => 'pendiente',
    ]);

    actingAs($admin);

    patch(route('admin.usuarios.approve', $pendingUser->id_user))
        ->assertRedirect(route('admin.usuarios.index'));

    $updatedLog = latestAuditByMessageAndTable('Usuario actualizado', 'users');

    expect($updatedLog)->not->toBeNull()
        ->and($updatedLog?->tipo)->toBe('warning')
        ->and($updatedLog?->contexto)->toBeArray()
        ->and(Arr::get($updatedLog?->contexto, 'registro_id'))->toBe($pendingUser->id_user)
        ->and(Arr::get($updatedLog?->contexto, 'tabla'))->toBe('users')
        ->and(Arr::get($updatedLog?->contexto, 'ip'))->toBe('127.0.0.1')
        ->and(Arr::get($updatedLog?->contexto, 'changes.estado'))->toBe('aprobado');
});
