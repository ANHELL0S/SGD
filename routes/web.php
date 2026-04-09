<?php

use App\Http\Controllers\Admin\AreaController;
use App\Http\Controllers\Admin\RemitenteController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\User\DocumentoController;
use App\Http\Controllers\User\MovimientoController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified', 'ensure.approved'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::prefix('admin')
    ->name('admin.')
    ->middleware(['auth', 'verified', 'ensure.approved', 'check.role:admin'])
    ->group(function () {
        Route::controller(UserController::class)->group(function () {
            Route::get('usuarios', 'index')->name('usuarios.index');
            Route::patch('usuarios/{user}/approve', 'approve')->name('usuarios.approve');
            Route::patch('usuarios/{user}/reject', 'reject')->name('usuarios.reject');
        });

        Route::controller(AreaController::class)->group(function () {
            Route::get('areas', 'index')->name('areas.index');
            Route::post('areas', 'store')->name('areas.store');
            Route::patch('areas/{area}', 'update')->name('areas.update');
            Route::delete('areas/{area}', 'destroy')->name('areas.destroy');
        });

        Route::controller(RemitenteController::class)->group(function () {
            Route::get('remitentes', 'index')->name('remitentes.index');
            Route::post('remitentes', 'store')->name('remitentes.store');
            Route::patch('remitentes/{remitente}', 'update')->name('remitentes.update');
            Route::delete('remitentes/{remitente}', 'destroy')->name('remitentes.destroy');
        });

        Route::controller(DocumentoController::class)->group(function () {
            Route::get('documentos/eliminados', 'deletedIndex')->name('documentos.deleted');
            Route::patch('documentos/{documento}/restore', 'restore')->name('documentos.restore');
        });
    });

Route::prefix('user')
    ->name('user.')
    ->middleware(['auth', 'verified', 'ensure.approved'])
    ->group(function () {
        Route::controller(MovimientoController::class)->middleware('check.role:user')->group(function () {
            Route::get('movimientos', 'index')->name('movimientos.index');
            Route::post('movimientos', 'store')->name('movimientos.store');
            Route::patch('movimientos/{movimiento}/marcar-recibido', 'marcarRecibido')->name('movimientos.marcar-recibido');
            Route::get('movimientos/{movimiento}/responder', 'responder')->name('movimientos.responder');
            Route::post('movimientos/responder', 'storeRespuesta')->name('movimientos.responder.store');
        });

        Route::controller(DocumentoController::class)->group(function () {
            Route::get('documentos', 'index')->middleware('check.role:user,admin')->name('documentos.index');
            Route::get('documentos/create', 'create')->middleware('check.role:user')->name('documentos.create');
            Route::get('documentos/{documento}', 'show')->middleware('check.role:user,admin')->name('documentos.show');
            Route::get('documentos/{documento}/edit', 'edit')->middleware('check.role:user,admin')->name('documentos.edit');
            Route::patch('documentos/{documento}', 'update')->middleware('check.role:user,admin')->name('documentos.update');
            Route::post('documentos', 'store')->middleware('check.role:user')->name('documentos.store');
            Route::delete('documentos/{documento}', 'destroy')->middleware('check.role:user')->name('documentos.destroy');
        });
    });

require __DIR__.'/settings.php';
