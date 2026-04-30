<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\Area;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
                'habilitado',
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

    public function create(): Response
    {
        return Inertia::render('admin/usuarios/create', [
            'areas' => $this->areaOptions(),
            'roles' => $this->roleOptions(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = User::create([
            ...$request->validated(),
            'password' => Hash::make($request->string('password')->toString()),
            'estado' => 'aprobado',
            'habilitado' => true,
            'email_verified_at' => now(),
        ]);

        return to_route('admin.usuarios.show', $user);
    }

    public function show(User $user): Response
    {
        $user->load('area:id_area,nombre');

        return Inertia::render('admin/usuarios/show', [
            'user' => $user,
        ]);
    }

    public function edit(User $user): Response
    {
        $user->load('area:id_area,nombre');

        return Inertia::render('admin/usuarios/edit', [
            'user' => $user,
            'areas' => $this->areaOptions(),
            'roles' => $this->roleOptions(),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        if ($request->filled('password')) {
            $validated['password'] = Hash::make($request->string('password')->toString());
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return to_route('admin.usuarios.show', $user);
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

    public function disable(User $user): RedirectResponse
    {
        if ($user->estado !== 'aprobado') {
            return to_route('admin.usuarios.index');
        }

        $user->update([
            'habilitado' => false,
        ]);

        return to_route('admin.usuarios.index');
    }

    public function enable(User $user): RedirectResponse
    {
        if ($user->estado !== 'aprobado') {
            return to_route('admin.usuarios.index');
        }

        $user->update([
            'habilitado' => true,
        ]);

        return to_route('admin.usuarios.index');
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function roleOptions(): array
    {
        return [
            ['value' => 'user',      'label' => 'Usuario'],
            ['value' => 'admin',     'label' => 'Administrador'],
            ['value' => 'consultor', 'label' => 'Consultor'],
        ];
    }

    /**
     * @return array<int, array{id_area: int, nombre: string}>
     */
    private function areaOptions(): array
    {
        return Area::query()
            ->select(['id_area', 'nombre'])
            ->orderBy('nombre')
            ->get()
            ->map(fn (Area $area): array => [
                'id_area' => $area->id_area,
                'nombre' => $area->nombre,
            ])
            ->all();
    }
}
