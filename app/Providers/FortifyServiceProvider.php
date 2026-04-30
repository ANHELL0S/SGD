<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\User;
use App\Support\RequestIpResolver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureAuthentication();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => true,
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure custom authentication checks.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request): ?User {
            $usernameField = Fortify::username();
            $username = $request->input($usernameField);
            $ipContext = RequestIpResolver::resolve($request);

            $user = User::query()->where($usernameField, $username)->first();

            if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
                Log::channel('auth')->warning('Intento de login fallido', [
                    'user_id' => $user?->id_user,
                    ...$ipContext,
                    'username' => $username,
                ]);

                return null;
            }

            if ($user->estado !== 'aprobado' || ! $user->habilitado) {
                Log::channel('auth')->warning('Intento de login rechazado por estado de cuenta', [
                    'user_id' => $user->id_user,
                    ...$ipContext,
                    'estado' => $user->estado,
                    'habilitado' => $user->habilitado,
                    'username' => $username,
                ]);

                $errorMessage = ! $user->habilitado
                    ? 'Su cuenta ha sido deshabilitada. Contacte con un administrador.'
                    : 'Su cuenta aún no ha sido aprobada';

                throw ValidationException::withMessages([
                    $usernameField => $errorMessage,
                ]);
            }

            return $user;
        });
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $ipAddress = RequestIpResolver::resolve($request)['ip_cliente'] ?? $request->ip();
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$ipAddress);

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
