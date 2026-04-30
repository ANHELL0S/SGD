<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(RefreshDatabase::class);

it('renders the custom 404 page for missing routes', function () {
    $user = User::factory()->create([
        'rol' => 'user',
        'estado' => 'aprobado',
    ]);

    actingAs($user);
    $this->withoutVite();

    get('/esta-ruta-no-existe')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('errors/404')
        );
});
