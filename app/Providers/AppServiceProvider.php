<?php

namespace App\Providers;

use App\Models\User;
use App\Services\OcrService;
use App\Support\RequestIpResolver;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Fortify;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(OcrService::class, fn (): OcrService => new OcrService(
            tesseractExecutable: (string) config('ocr.tesseract_executable', '/usr/bin/tesseract'),
            language: (string) config('ocr.language', 'spa'),
            imageDpi: (int) config('ocr.image_dpi', 300),
            pdfDpi: (int) config('ocr.pdf_dpi', 300),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        Event::listen(Login::class, function (Login $event): void {
            if (! $event->user instanceof User) {
                return;
            }

            $ipContext = RequestIpResolver::resolve(request());

            Log::channel('auth')->info('Login exitoso', [
                'user_id' => $event->user->id_user,
                ...$ipContext,
                'username' => request()?->input(Fortify::username()),
                'guard' => $event->guard,
            ]);
        });

        Event::listen(Registered::class, function (Registered $event): void {
            $user = $event->user;

            if (! $user instanceof User) {
                return;
            }

            $ipContext = RequestIpResolver::resolve(request());

            Log::channel('auth')->info('Registro exitoso', [
                'user_id' => $user?->id_user,
                ...$ipContext,
                'username' => $user?->email,
                'guard' => config('auth.defaults.guard'),
            ]);
        });

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
