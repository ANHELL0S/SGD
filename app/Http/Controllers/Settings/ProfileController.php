<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Gestiona la configuración del perfil del usuario autenticado.
 *
 * Cubre la visualización y edición de datos personales, y la eliminación
 * de la cuenta con cierre de sesión y limpieza de la sesión activa.
 */
class ProfileController extends Controller
{
    /**
     * Muestra la página de configuración del perfil del usuario.
     *
     * Indica si el usuario debe verificar su email (contrato {@see MustVerifyEmail}).
     *
     * @param  Request $request
     * @return Response
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Actualiza la información del perfil del usuario autenticado.
     *
     * Si el email cambia, resetea `email_verified_at` para forzar una nueva verificación.
     *
     * @param  ProfileUpdateRequest $request Datos validados del perfil.
     * @return RedirectResponse
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Elimina la cuenta del usuario autenticado.
     *
     * Cierra la sesión, elimina el registro y luego invalida la sesión
     * y regenera el token CSRF antes de redirigir al inicio.
     *
     * @param  ProfileDeleteRequest $request Petición con confirmación de contraseña validada.
     * @return RedirectResponse
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
