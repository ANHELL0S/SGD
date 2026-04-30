<?php

use App\Models\LogSistema;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(RefreshDatabase::class);

test('guests are redirected from admin monitoreo page', function () {
    get(route('admin.monitoreo.index'))
        ->assertRedirect(route('login'));
});

test('non admin users cannot access monitoreo admin page', function () {
    $user = User::factory()->create([
        'rol' => 'user',
    ]);

    actingAs($user);

    get(route('admin.monitoreo.index'))->assertRedirect('/');
});

test('admin users can view monitoreo page with paginated logs', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    LogSistema::query()->create([
        'tipo' => 'info',
        'mensaje' => 'Primer log',
        'contexto' => ['modulo' => 'auth'],
        'user_id' => $admin->id_user,
    ]);

    actingAs($admin);

    get(route('admin.monitoreo.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/monitoreo/index')
            ->has('logs.data')
            ->where('logs.data', fn ($logs) => collect($logs)->contains(function (array $log): bool {
                return $log['tipo'] === 'info'
                    && $log['mensaje'] === 'Primer log';
            }))
            ->where('filters.per_page', '5')
        );
});

test('admin users can filter logs by tipo y usuario', function () {
    $admin = User::factory()->create([
        'rol' => 'admin',
    ]);

    $otherUser = User::factory()->create();

    LogSistema::query()->create([
        'tipo' => 'error',
        'mensaje' => 'Debe aparecer',
        'contexto' => ['x' => 1],
        'user_id' => $admin->id_user,
        'created_at' => '2026-04-09 10:00:00',
    ]);

    LogSistema::query()->create([
        'tipo' => 'info',
        'mensaje' => 'No por tipo',
        'contexto' => ['x' => 2],
        'user_id' => $admin->id_user,
        'created_at' => '2026-04-09 10:00:00',
    ]);

    LogSistema::query()->create([
        'tipo' => 'error',
        'mensaje' => 'No por usuario',
        'contexto' => ['x' => 3],
        'user_id' => $otherUser->id_user,
        'created_at' => '2026-04-09 10:00:00',
    ]);

    actingAs($admin);

    get(route('admin.monitoreo.index', [
        'tipo' => 'error',
        'usuario_id' => $admin->id_user,
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/monitoreo/index')
            ->has('logs.data')
            ->where('logs.data', fn ($logs) => collect($logs)->contains(function (array $log): bool {
                return $log['mensaje'] === 'Debe aparecer';
            }))
            ->where('filters.tipo', 'error')
            ->where('filters.fecha', '')
            ->where('filters.usuario_id', (string) $admin->id_user)
        );
});
