<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea el acceso a usuarios autenticados cuya cuenta no esté aprobada o esté deshabilitada.
 *
 * Si el usuario no cumple los requisitos, cierra la sesión, invalida la cookie
 * y redirige al login con un mensaje explicativo.
 */
class EnsureUserIsApproved
{
    /**
     * Permite continuar solo si el usuario está aprobado y habilitado.
     *
     * Si la cuenta está pendiente → mensaje "cuenta no aprobada".
     * Si la cuenta está deshabilitada → mensaje "cuenta deshabilitada".
     * En ambos casos se destruye la sesión antes de redirigir.
     *
     * @param  Request $request
     * @param  Closure $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ($user->estado === 'aprobado' && $user->habilitado)) {
            return $next($request);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $errorMessage = ! $user->habilitado
            ? 'Su cuenta ha sido deshabilitada. Contacte con un administrador.'
            : 'Su cuenta aún no ha sido aprobada';

        return redirect()->route('login')->withErrors([
            'email' => $errorMessage,
        ]);
    }
}
