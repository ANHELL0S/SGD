<?php

use App\Models\Remitente;
use App\Models\Area;
use App\Models\Documento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\from;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

uses(RefreshDatabase::class);

test('guests are redirected from admin remitentes page', function () {
    $response = get(route('admin.remitentes.index'));

    $response->assertRedirect(route('login'));
});

test('admin users can view remitentes page', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $remitente = Remitente::create([
        'nombre' => 'MUNICIPALIDAD 01',
        'estado' => true,
    ]);

    actingAs($admin);

    get(route('admin.remitentes.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/remitentes/index')
            ->has('remitentes.data')
            ->where('remitentes.data', fn ($remitentes) => $remitentes->contains(function (array $current) use ($remitente): bool {
                return $current['id_remitente'] === $remitente->id_remitente
                    && $current['nombre'] === 'MUNICIPALIDAD 01';
            }))
        );
});

test('admin users can create remitentes in uppercase', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    actingAs($admin);

    post(route('admin.remitentes.store'), [
        'nombre' => 'municipalidad 99',
    ])->assertRedirect(route('admin.remitentes.index'));

    expect(Remitente::query()->where('nombre', 'MUNICIPALIDAD 99')->exists())->toBeTrue();
});

test('remitente names reject symbols', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    actingAs($admin);

    from(route('admin.remitentes.index'));

    post(route('admin.remitentes.store'), [
        'nombre' => 'MUNI@123',
    ])
        ->assertRedirect(route('admin.remitentes.index'))
        ->assertSessionHasErrors('nombre');
});

test('non admin users cannot access remitentes admin page', function () {
    $user = User::factory()->create([
        'rol' => 'user',
    ]);

    actingAs($user);

    $response = get(route('admin.remitentes.index'));

    $response->assertForbidden();
});

test('admin users can update a remitente', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $remitente = Remitente::create([
        'nombre' => 'GOBIERNO REGIONAL 1',
        'estado' => true,
    ]);

    actingAs($admin);

    patch(route('admin.remitentes.update', $remitente), [
        'nombre' => 'gobierno regional 55',
        'estado' => '0',
    ])->assertRedirect(route('admin.remitentes.index'));

    expect($remitente->refresh()->nombre)->toBe('GOBIERNO REGIONAL 55')
        ->and($remitente->estado)->toBeFalse();
});

test('admin users can delete a remitente without documentos', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $remitente = Remitente::create([
        'nombre' => 'ONPE 01',
        'estado' => true,
    ]);

    actingAs($admin);

    delete(route('admin.remitentes.destroy', $remitente))
        ->assertRedirect(route('admin.remitentes.index'));

    expect(Remitente::query()->whereKey($remitente->id_remitente)->exists())->toBeFalse();
});

test('admin users cannot delete a remitente with documentos asociados', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $area = Area::create([
        'nombre' => 'MESA DE PARTES',
    ]);

    $user = User::factory()->create([
        'rol' => 'user',
        'area_id' => $area->id_area,
    ]);

    $remitente = Remitente::create([
        'nombre' => 'RENIEC 01',
        'estado' => true,
    ]);

    Documento::create([
        'numero_oficio' => 'OF-2026-900',
        'fecha_oficio' => '2026-04-04',
        'remitente_id' => $remitente->id_remitente,
        'tipo' => 'externo',
        'palabra_clave' => 'REGISTRO',
        'archivo' => 'documentos/prueba.pdf',
        'area_actual_id' => $area->id_area,
        'user_id' => $user->id_user,
        'recibido' => 'recibido',
    ]);

    actingAs($admin);
    from(route('admin.remitentes.index'));

    delete(route('admin.remitentes.destroy', $remitente))
        ->assertRedirect(route('admin.remitentes.index'))
        ->assertSessionHasErrors('remitente');

    expect(Remitente::query()->whereKey($remitente->id_remitente)->exists())->toBeTrue();
});
