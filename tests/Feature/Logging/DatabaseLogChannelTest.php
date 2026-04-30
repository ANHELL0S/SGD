<?php

use App\Models\LogSistema;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

test('auth channel stores logs in database with custom user key', function () {
    $user = User::factory()->create();

    actingAs($user);

    Log::channel('auth')->info('Prueba de log en BD', [
        'modulo' => 'autenticacion',
        'accion' => 'login',
    ]);

    $log = LogSistema::query()
        ->where('mensaje', 'Prueba de log en BD')
        ->latest('id_log')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->tipo)->toBe('info')
        ->and($log->mensaje)->toBe('Prueba de log en BD')
        ->and($log->user_id)->toBe($user->id_user)
        ->and($log->contexto)->toMatchArray([
            'modulo' => 'autenticacion',
            'accion' => 'login',
        ]);
});
