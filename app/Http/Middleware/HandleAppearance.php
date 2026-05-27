<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

/**
 * Comparte la preferencia de apariencia (tema claro/oscuro/sistema) con todas las vistas.
 *
 * Lee el valor desde la cookie `appearance` y lo expone como variable global
 * de Blade mediante `View::share`, con `'system'` como valor por defecto.
 */
class HandleAppearance
{
    /**
     * Inyecta la variable `appearance` en todas las vistas antes de pasar la petición.
     *
     * @param  Request                  $request
     * @param  Closure(Request): Response $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        View::share('appearance', $request->cookie('appearance') ?? 'system');

        return $next($request);
    }
}
