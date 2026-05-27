<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restringe el acceso a rutas según el rol del usuario autenticado.
 *
 * Se registra como middleware de ruta con alias `role` y acepta uno o varios
 * roles como argumentos variádicos: `->middleware('role:admin,consultor')`.
 */
class CheckRole
{
    /**
     * Verifica que el rol del usuario autenticado esté entre los roles permitidos.
     *
     * Lanza 403 si el usuario no está autenticado o su rol no coincide con ninguno de los indicados.
     *
     * @param  Request              $request
     * @param  Closure              $next
     * @param  string               ...$roles Roles permitidos para acceder a la ruta.
     * @return Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_unless($user && in_array($user->rol, $roles, true), 403);

        return $next($request);
    }
}
