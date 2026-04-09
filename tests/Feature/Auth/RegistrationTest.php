<?php

use App\Models\Area;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    Area::query()->create(['nombre' => 'Secretaria']);

    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $area = Area::query()->create(['nombre' => 'Archivo']);

    $response = $this->post(route('register.store'), [
        'nombre' => 'Carlos',
        'apellido' => 'Perez',
        'cedula' => '0123456789',
        'area_id' => $area->id_area,
        'email' => 'test@example.com',
        'password' => 'Clave123@',
        'password_confirmation' => 'Clave123@',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::query()->where('email', 'test@example.com')->firstOrFail();

    expect($user->nombre)->toBe('Carlos')
        ->and($user->apellido)->toBe('Perez')
        ->and($user->cedula)->toBe('0123456789')
        ->and($user->estado)->toBe('pendiente')
        ->and($user->rol)->toBe('user')
        ->and($user->area_id)->toBe($area->id_area);
});

test('registration validates nombre, apellido, cedula and password rules', function () {
    $area = Area::query()->create(['nombre' => 'Atencion Ciudadana']);

    $response = $this->from(route('register'))->post(route('register.store'), [
        'nombre' => 'Carlos123',
        'apellido' => 'Perez9',
        'cedula' => '12345abcde',
        'area_id' => $area->id_area,
        'email' => 'invalid-user@example.com',
        'password' => 'clave1234',
        'password_confirmation' => 'clave1234',
    ]);

    $response->assertRedirect(route('register'));
    $response->assertSessionHasErrors(['nombre', 'apellido', 'cedula', 'password']);
    $this->assertGuest();
});

test('registration validates cedula length to exactly ten digits', function () {
    $area = Area::query()->create(['nombre' => 'Recursos Humanos']);

    $response = $this->from(route('register'))->post(route('register.store'), [
        'nombre' => 'Maria',
        'apellido' => 'Lopez',
        'cedula' => '123456789',
        'area_id' => $area->id_area,
        'email' => 'cedula-length@example.com',
        'password' => 'Clave123@',
        'password_confirmation' => 'Clave123@',
    ]);

    $response->assertRedirect(route('register'));
    $response->assertSessionHasErrors(['cedula']);
    $this->assertGuest();
});
