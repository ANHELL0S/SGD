<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 5);

        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        $baseQuery = User::query()
            ->with('area:id_area,nombre')
            ->select([
                'id_user',
                'nombre',
                'apellido',
                'email',
                'rol',
                'estado',
                'area_id',
                'created_at',
            ]);

        return Inertia::render('admin/usuarios/index', [
            'approvedUsers' => (clone $baseQuery)
                ->where('estado', 'aprobado')
                ->orderByDesc('created_at')
                ->paginate($perPage, ['*'], 'approved_page')
                ->withQueryString(),
            'pendingUsers' => (clone $baseQuery)
                ->where('estado', 'pendiente')
                ->orderByDesc('created_at')
                ->paginate($perPage, ['*'], 'pending_page')
                ->withQueryString(),
            'filters' => [
                'per_page' => (string) $perPage,
            ],
        ]);
    }

    public function approve(User $user): RedirectResponse
    {
        $user->update([
            'estado' => 'aprobado',
        ]);

        return to_route('admin.usuarios.index');
    }

    public function reject(User $user): RedirectResponse
    {
        $user->update([
            'estado' => 'rechazado',
        ]);

        return to_route('admin.usuarios.index');
    }
}
