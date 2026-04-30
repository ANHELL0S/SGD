<?php

use App\Models\Area;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

uses(RefreshDatabase::class);

test('admin can view usuarios page with inertia props', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $pendingUser = User::factory()->create([
        'estado' => 'pendiente',
    ]);

    actingAs($admin);

    get(route('admin.usuarios.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/usuarios/index')
            ->has('pendingUsers.data')
            ->where('pendingUsers.data', fn ($users) => $users->contains(function (array $user) use ($pendingUser): bool {
                return $user['id_user'] === $pendingUser->id_user
                    && $user['estado'] === 'pendiente';
            }))
        );
});

test('admin can view the user creation form', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $area = Area::query()->create(['nombre' => 'SECRETARIA']);

    actingAs($admin);

    get(route('admin.usuarios.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/usuarios/create')
            ->where('areas', fn ($areas) => collect($areas)
                ->pluck('id_area')
                ->contains($area->id_area)));
});

test('admin can create users from the panel', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $area = Area::query()->create(['nombre' => 'ATENCION']);

    actingAs($admin);

    $response = post(route('admin.usuarios.store'), [
        'nombre' => 'Ana',
        'apellido' => 'López',
        'cedula' => '1234567890',
        'email' => 'ana.lopez@example.com',
        'area_id' => $area->id_area,
        'rol' => 'user',
        'password' => 'Clave123@',
        'password_confirmation' => 'Clave123@',
    ]);

    $user = User::query()->where('email', 'ana.lopez@example.com')->firstOrFail();

    $response->assertRedirect(route('admin.usuarios.show', $user));

    expect($user->nombre)->toBe('Ana')
        ->and($user->apellido)->toBe('López')
        ->and($user->estado)->toBe('aprobado')
        ->and($user->habilitado)->toBeTrue()
        ->and($user->area_id)->toBe($area->id_area);
});

test('admin can view the user edit form', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $user = User::factory()->create();

    actingAs($admin);

    get(route('admin.usuarios.edit', $user))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/usuarios/edit')
            ->where('user.id_user', $user->id_user)
            ->has('areas'));
});

test('admin can approve pending users', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $pendingUser = User::factory()->create([
        'estado' => 'pendiente',
    ]);

    actingAs($admin);

    patch(route('admin.usuarios.approve', $pendingUser))
        ->assertRedirect(route('admin.usuarios.index'));

    expect($pendingUser->refresh()->estado)->toBe('aprobado');
});

test('admin can reject pending users', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $pendingUser = User::factory()->create([
        'estado' => 'pendiente',
    ]);

    actingAs($admin);

    patch(route('admin.usuarios.reject', $pendingUser))
        ->assertRedirect(route('admin.usuarios.index'));

    expect($pendingUser->refresh()->estado)->toBe('rechazado');
});

test('admin can disable approved users', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $approvedUser = User::factory()->create([
        'estado' => 'aprobado',
    ]);

    actingAs($admin);

    patch(route('admin.usuarios.disable', $approvedUser))
        ->assertRedirect(route('admin.usuarios.index'));

    expect($approvedUser->refresh()->habilitado)->toBeFalse();
});

test('admin can enable disabled users', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $disabledUser = User::factory()->create([
        'estado' => 'aprobado',
        'habilitado' => false,
    ]);

    actingAs($admin);

    patch(route('admin.usuarios.enable', $disabledUser))
        ->assertRedirect(route('admin.usuarios.index'));

    expect($disabledUser->refresh()->habilitado)->toBeTrue();
});

test('disabled users appear in usuarios registrados tab data', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $disabledUser = User::factory()->create([
        'estado' => 'aprobado',
        'habilitado' => false,
    ]);

    actingAs($admin);

    get(route('admin.usuarios.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/usuarios/index')
            ->where('approvedUsers.data', fn ($users) => $users->contains(function (array $user) use ($disabledUser): bool {
                return $user['id_user'] === $disabledUser->id_user
                    && $user['estado'] === 'aprobado'
                    && $user['habilitado'] === false;
            }))
        );
});

test('non admin users cannot access admin usuarios routes', function () {
    $user = User::factory()->create([
        'rol' => 'user',
    ]);

    $target = User::factory()->create([
        'estado' => 'pendiente',
    ]);

    actingAs($user);

    get(route('admin.usuarios.index'))->assertRedirect('/');
    patch(route('admin.usuarios.approve', $target))->assertRedirect('/');
    patch(route('admin.usuarios.reject', $target))->assertRedirect('/');
    patch(route('admin.usuarios.disable', $target))->assertRedirect('/');
    patch(route('admin.usuarios.enable', $target))->assertRedirect('/');
});
