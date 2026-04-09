<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;

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

test('non admin users cannot access admin usuarios routes', function () {
    $user = User::factory()->create([
        'rol' => 'user',
    ]);

    $target = User::factory()->create([
        'estado' => 'pendiente',
    ]);

    actingAs($user);

    get(route('admin.usuarios.index'))->assertForbidden();
    patch(route('admin.usuarios.approve', $target))->assertForbidden();
    patch(route('admin.usuarios.reject', $target))->assertForbidden();
});
