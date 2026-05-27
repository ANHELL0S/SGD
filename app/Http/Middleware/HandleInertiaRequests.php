<?php

namespace App\Http\Middleware;

use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Middleware;

/**
 * Configura el middleware de Inertia: template raíz, versionado de assets y props globales.
 *
 * Props compartidas con todas las páginas: datos del usuario autenticado, contadores
 * de pendientes (usuarios para admin, movimientos para usuarios), estado del sidebar
 * y mensajes flash de sesión.
 */
class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define las props compartidas globalmente con todas las páginas Inertia.
     *
     * Incluye: `auth.user` (datos del usuario), `pendingCount` (usuarios pendientes, solo admin),
     * `pendingMovimientosCount` (movimientos sin respuesta, solo usuario con área),
     * `sidebarOpen` (estado del sidebar), `flash` (mensajes de sesión) y `name` (app name).
     *
     * @see https://inertiajs.com/shared-data
     *
     * @param  Request $request
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user
                    ? [
                        'id' => $user->id_user,
                        'id_user' => $user->id_user,
                        'name' => trim(implode(' ', array_filter([$user->nombre, $user->apellido]))),
                        'nombre' => $user->nombre,
                        'apellido' => $user->apellido,
                        'email' => $user->email,
                        'rol' => $user->rol,
                        'estado' => $user->estado,
                        'area_id' => $user->area_id,
                        'avatar' => null,
                        'email_verified_at' => $user->email_verified_at,
                        'created_at' => $user->created_at,
                        'updated_at' => $user->updated_at,
                    ]
                    : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'pendingCount' => $user && $user->rol === 'admin'
                ? User::query()
                    ->where('estado', 'pendiente')
                    ->count()
                : null,
            'pendingMovimientosCount' => $user && $user->rol === 'user' && $user->area_id !== null
                ? Movimiento::query()
                    ->where('a_area_id', $user->area_id)
                    ->where(function (Builder $query) use ($user): void {
                        $query->whereNull('destinatario_user_id')
                            ->orWhere('destinatario_user_id', $user->id_user);
                    })
                    ->where(function (Builder $query): void {
                        $query->whereNull('expediente_id')
                            ->orWhereHas('expediente', fn (Builder $q) => $q->where('estado', 'abierto'));
                    })
                    ->whereDoesntHave('documento.documentoHilo', function (Builder $query) use ($user): void {
                        $query->where('user_id', $user->id_user)
                            ->whereNotNull('conversacion_cerrada_at');
                    })
                    ->whereDoesntHave('documentosGenerados')
                    ->whereNull('respuesta_comentario')
                    ->where('fecha_envio', '>=', now()->subDays(12))
                    ->count()
                : null,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'retry_after' => $request->session()->get('retry_after'),
            ],
        ];
    }
}
