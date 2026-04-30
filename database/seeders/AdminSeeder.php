<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'nombre'             => 'Admin',
                'apellido'           => 'Sistema',
                'cedula'             => '0000000000',
                'email_verified_at'  => now(),
                'password'           => Hash::make('Admin1234.'),
                'rol'                => 'admin',
                'estado'             => 'aprobado',
                'habilitado'         => true,
                'area_id'            => null,
            ]
        );
    }
}
