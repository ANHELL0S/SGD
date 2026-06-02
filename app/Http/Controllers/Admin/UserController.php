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

/**
 * Gestiona el ciclo de vida de los usuarios desde la perspectiva del administrador.
 *
 * Cubre creación, edición, aprobación/rechazo de registros pendientes
 * y habilitación/deshabilitación de cuentas ya aprobadas.
 */
class UserController extends Controller
{
    /**
     * Lista los usuarios aprobados y pendientes de aprobación con paginación independiente.
     *
     * @param  Request $request Parámetro opcional: `per_page`.
     * @return Response
     */
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

    /**
     * Muestra el formulario de creación de un nuevo usuario.
     *
     * @return Response
     */
    public function create(): Response
    {
        return Inertia::render('admin/usuarios/create', [
            'areas' => $this->areaOptions(),
            'roles' => $this->roleOptions(),
        ]);
    }

    /**
     * Crea un usuario nuevo con estado aprobado y correo verificado de inmediato.
     *
     * La contraseña se hashea antes de persistir. Redirige al perfil del usuario creado.
     *
     * @param  StoreUserRequest $request Datos validados del nuevo usuario.
     * @return RedirectResponse
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = User::create([
            ...$request->validated(),
            'password' => Hash::make($request->string('password')->toString()),
            'estado' => 'aprobado',
            'habilitado' => true,
            'email_verified_at' => now(),
        ]);

        return to_route('admin.usuarios.show', $user)
            ->with('success', 'Usuario creado correctamente.');
    }

    /**
     * Muestra el perfil detallado de un usuario, incluyendo su área.
     *
     * @param  User $user Usuario a visualizar (route model binding).
     * @return Response
     */
    public function show(User $user): Response
    {
        $user->load('area:id_area,nombre');

        return Inertia::render('admin/usuarios/show', [
            'user' => $user,
        ]);
    }

    /**
     * Muestra el formulario de edición del usuario con las opciones de área y rol.
     *
     * @param  User $user Usuario a editar (route model binding).
     * @return Response
     */
    public function edit(User $user): Response
    {
        $user->load('area:id_area,nombre');

        return Inertia::render('admin/usuarios/edit', [
            'user' => $user,
            'areas' => $this->areaOptions(),
            'roles' => $this->roleOptions(),
        ]);
    }

    /**
     * Actualiza los datos del usuario. Si se envía contraseña nueva, la hashea antes de guardar.
     *
     * @param  UpdateUserRequest $request Datos validados a actualizar.
     * @param  User              $user    Usuario a modificar (route model binding).
     * @return RedirectResponse
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        if ($request->filled('password')) {
            $validated['password'] = Hash::make($request->string('password')->toString());
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return to_route('admin.usuarios.show', $user)
            ->with('success', 'Usuario actualizado correctamente.');
    }

    /**
     * Aprueba el registro pendiente de un usuario.
     *
     * @param  User $user Usuario pendiente (route model binding).
     * @return RedirectResponse
     */
    public function approve(User $user): RedirectResponse
    {
        $user->update([
            'estado' => 'aprobado',
        ]);

        return to_route('admin.usuarios.index');
    }

    /**
     * Rechaza el registro pendiente de un usuario.
     *
     * @param  User $user Usuario pendiente (route model binding).
     * @return RedirectResponse
     */
    public function reject(User $user): RedirectResponse
    {
        $user->update([
            'estado' => 'rechazado',
        ]);

        return to_route('admin.usuarios.index');
    }

    /**
     * Deshabilita el acceso de un usuario aprobado sin eliminar su cuenta.
     *
     * No tiene efecto si el usuario no está en estado `aprobado`.
     *
     * @param  User $user Usuario a deshabilitar (route model binding).
     * @return RedirectResponse
     */
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

    /**
     * Rehabilita el acceso de un usuario aprobado previamente deshabilitado.
     *
     * No tiene efecto si el usuario no está en estado `aprobado`.
     *
     * @param  User $user Usuario a habilitar (route model binding).
     * @return RedirectResponse
     */
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
     * Devuelve las opciones de rol disponibles para selects del formulario.
     *
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
     * Devuelve todas las áreas activas ordenadas alfabéticamente para selects del formulario.
     *
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
