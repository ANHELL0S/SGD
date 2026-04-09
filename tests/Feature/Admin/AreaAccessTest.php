<?php

use App\Models\Area;
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

test('guests are redirected from the admin areas page', function () {
    $response = get(route('admin.areas.index'));

    $response->assertRedirect(route('login'));
});

test('non admin users cannot access the admin areas page', function () {
    $user = User::factory()->create([
        'rol' => 'user',
    ]);

    actingAs($user);

    $response = get(route('admin.areas.index'));

    $response->assertForbidden();
});

test('admin users can view the areas page with areas in inertia props', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $archiveArea = Area::create([
        'nombre' => 'ARCHIVO',
    ]);

    Area::create([
        'nombre' => 'JURIDICO',
    ]);

    actingAs($admin);

    get(route('admin.areas.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/areas/index')
            ->has('areas.data')
            ->where('areas.data', fn ($areas) => $areas->contains(function (array $area) use ($archiveArea): bool {
                return $area['id_area'] === $archiveArea->id_area && $area['nombre'] === 'ARCHIVO';
            }))
        );
});

test('admin users can create areas using uppercase letters only', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    actingAs($admin);

    post(route('admin.areas.store'), [
            'nombre' => 'recursos humanos',
        ])
        ->assertRedirect(route('admin.areas.index'));

    expect(Area::query()->where('nombre', 'RECURSOS HUMANOS')->exists())->toBeTrue();
});

test('area names reject numbers and symbols', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    actingAs($admin);

    from(route('admin.areas.index'));

    post(route('admin.areas.store'), [
            'nombre' => 'AREA 1@',
        ])
        ->assertRedirect(route('admin.areas.index'))
        ->assertSessionHasErrors('nombre');
});

test('admin users can update an area', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $area = Area::create([
        'nombre' => 'ARCHIVO',
    ]);

    actingAs($admin);

    patch(route('admin.areas.update', $area), [
        'nombre' => 'gestion documental',
    ])->assertRedirect(route('admin.areas.index'));

    expect($area->refresh()->nombre)->toBe('GESTION DOCUMENTAL');
});

test('admin users can delete an area', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $area = Area::create([
        'nombre' => 'TEMPORAL',
    ]);

    actingAs($admin);

    delete(route('admin.areas.destroy', $area))
        ->assertRedirect(route('admin.areas.index'));

    expect(Area::query()->whereKey($area->id_area)->exists())->toBeFalse();
});

test('admin users cannot delete an area with related users', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $area = Area::create([
        'nombre' => 'SECRETARIA',
    ]);

    User::factory()->create([
        'area_id' => $area->id_area,
    ]);

    actingAs($admin);

    from(route('admin.areas.index'));

    delete(route('admin.areas.destroy', $area))
        ->assertRedirect(route('admin.areas.index'))
        ->assertSessionHasErrors('area');

    expect(Area::query()->whereKey($area->id_area)->exists())->toBeTrue();
});
