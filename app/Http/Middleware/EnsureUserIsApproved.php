<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsApproved
{
    /**
     * Handle an incoming request.
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
