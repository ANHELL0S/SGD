<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

/**
 * Gestiona la configuración de seguridad del usuario: contraseña y 2FA.
 *
 * Implementa {@see HasMiddleware} para aplicar `password.confirm` en la vista de
 * seguridad cuando Fortify tiene habilitada la opción de confirmación de contraseña en 2FA.
 */
class SecurityController extends Controller implements HasMiddleware
{
    /**
     * Devuelve los middlewares asignados al controlador.
     *
     * Aplica `password.confirm` solo en `edit` cuando Fortify tiene habilitado
     * el 2FA con la opción `confirmPassword` activada.
     *
     * @return array<int, Middleware>
     */
    public static function middleware(): array
    {
        return Features::canManageTwoFactorAuthentication()
            && Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword')
                ? [new Middleware('password.confirm', only: ['edit'])]
                : [];
    }

    /**
     * Muestra la página de configuración de seguridad del usuario.
     *
     * Incluye el estado del 2FA (habilitado, requiere confirmación) solo si
     * Fortify tiene activada la gestión de autenticación de dos factores.
     *
     * @param  TwoFactorAuthenticationRequest $request Petición con validación del estado 2FA.
     * @return Response
     */
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        $props = [
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
        ];

        if (Features::canManageTwoFactorAuthentication()) {
            $request->ensureStateIsValid();

            $props['twoFactorEnabled'] = $request->user()->hasEnabledTwoFactorAuthentication();
            $props['requiresConfirmation'] = Features::optionEnabled(Features::twoFactorAuthentication(), 'confirm');
        }

        return Inertia::render('settings/security', $props);
    }

    /**
     * Actualiza la contraseña del usuario autenticado.
     *
     * El hasheo de la contraseña es responsabilidad del cast definido en el modelo User.
     *
     * @param  PasswordUpdateRequest $request Datos validados con la nueva contraseña.
     * @return RedirectResponse
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);

        return back();
    }
}
