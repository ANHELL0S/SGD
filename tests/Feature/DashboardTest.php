<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('pending users are redirected to login from dashboard', function () {
    $user = User::factory()->create([
        'estado' => 'pendiente',
    ]);

    $response = $this->actingAs($user)->from(route('login'))->get(route('dashboard'));

    $response->assertRedirect(route('login'));
    $response->assertSessionHasErrors([
        'email' => 'Su cuenta aún no ha sido aprobada',
    ]);

    $this->assertGuest();
});
