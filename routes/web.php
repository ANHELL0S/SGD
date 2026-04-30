<?php

use App\Http\Controllers\Admin\AreaController;
use App\Http\Controllers\Admin\MonitoreoController;
use App\Http\Controllers\Admin\RemitenteController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\User\DocumentoController;
use App\Http\Controllers\User\ExpedienteController;
use App\Http\Controllers\User\AlertaController;
use App\Http\Controllers\Consultor\ConsultorController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\User\MovimientoController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified', 'ensure.approved'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

Route::prefix('admin')
    ->name('admin.')
    ->middleware(['auth', 'verified', 'ensure.approved', 'check.role:admin'])
    ->group(function () {
        Route::controller(UserController::class)->group(function () {
            Route::get('usuarios', 'index')->name('usuarios.index');
            Route::get('usuarios/create', 'create')->name('usuarios.create');
            Route::post('usuarios', 'store')->name('usuarios.store');
            Route::get('usuarios/{user}', 'show')->name('usuarios.show');
            Route::get('usuarios/{user}/edit', 'edit')->name('usuarios.edit');
            Route::patch('usuarios/{user}', 'update')->name('usuarios.update');
            Route::patch('usuarios/{user}/approve', 'approve')->name('usuarios.approve');
            Route::patch('usuarios/{user}/reject', 'reject')->name('usuarios.reject');
            Route::patch('usuarios/{user}/disable', 'disable')->name('usuarios.disable');
            Route::patch('usuarios/{user}/enable', 'enable')->name('usuarios.enable');
        });

        Route::controller(AreaController::class)->group(function () {
            Route::get('areas', 'index')->name('areas.index');
            Route::post('areas', 'store')->name('areas.store');
            Route::patch('areas/{area}', 'update')->name('areas.update');
            Route::delete('areas/{area}', 'destroy')->name('areas.destroy');
            Route::patch('areas/{area}/restore', 'restore')->name('areas.restore');
            Route::delete('areas/{id_area}/force', 'forceDelete')->name('areas.forceDelete');
            Route::get('areas/eliminados', 'deletedIndex')->name('areas.deleted');
        });

        Route::controller(RemitenteController::class)->group(function () {
            Route::get('remitentes', 'index')->name('remitentes.index');
            Route::post('remitentes', 'store')->name('remitentes.store');
            Route::patch('remitentes/{remitente}', 'update')->name('remitentes.update');
            Route::delete('remitentes/{remitente}', 'destroy')->name('remitentes.destroy');
            Route::patch('remitentes/{id_remitente}/restore', 'restore')->name('remitentes.restore');
            Route::delete('remitentes/{id_remitente}/force', 'forceDelete')->name('remitentes.forceDelete');
        });

        Route::controller(DocumentoController::class)->group(function () {
            Route::get('documentos/eliminados', 'deletedIndex')->name('documentos.deleted');
            Route::patch('documentos/{documento}/restore', 'restore')->name('documentos.restore');
        });

        Route::get('monitoreo', [MonitoreoController::class, 'index'])->name('monitoreo.index');
        Route::get('monitoreo/{log}', [MonitoreoController::class, 'show'])->name('monitoreo.show');
    });

Route::prefix('user')
    ->name('user.')
    ->middleware(['auth', 'verified', 'ensure.approved'])
    ->group(function () {
        // Rutas de Movimientos
        Route::controller(MovimientoController::class)->middleware('check.role:user')->group(function () {
            Route::get('movimientos', 'index')->name('movimientos.index');
            Route::get('movimientos/{movimiento}', 'show')->name('movimientos.show');
            Route::patch('movimientos/{movimiento}/marcar-recibido', 'marcarRecibido')->name('movimientos.marcar-recibido');
            Route::get('movimientos/{movimiento}/responder', 'responder')->name('movimientos.responder');
            Route::post('movimientos/responder', 'storeRespuesta')->name('movimientos.responder.store');
            Route::patch('movimientos/{movimiento}/cerrar-conversacion', 'cerrarConversacion')->name('movimientos.cerrar-conversacion');
            Route::patch('movimientos/{movimiento}/activar-conversacion', 'activarConversacion')->name('movimientos.activar-conversacion');
            Route::get('movimientos-cargar-mas', 'cargarMasPorGrupo')->name('movimientos.cargar-mas');
        });

        Route::post('movimientos', [MovimientoController::class, 'store'])
            ->middleware('check.role:user,admin')
            ->name('movimientos.store');

        // Rutas de Expedientes
        Route::controller(ExpedienteController::class)
            ->middleware('check.role:user')
            ->group(function () {
                Route::get('expedientes', 'index')->name('expedientes.index');
                Route::get('expedientes/{expediente}', 'show')->name('expedientes.show');
                Route::patch('expedientes/{expediente}/cerrar', 'cerrar')->name('expedientes.cerrar');
                Route::patch('expedientes/{expediente}/abrir', 'abrir')->name('expedientes.abrir');
                Route::patch('expedientes/{expediente}/prioridad', 'actualizarPrioridad')->name('expedientes.prioridad');
                Route::get('expedientes/{expediente}/exportar', 'exportar')->name('expedientes.exportar');
                Route::get('expedientes-estadisticas', 'estadisticas')->name('expedientes.estadisticas');
            });

        // Rutas de Documentos
        Route::controller(DocumentoController::class)->group(function () {
            Route::get('documentos', 'index')->middleware('check.role:user,admin')->name('documentos.index');
            Route::get('documentos/create', 'create')->middleware('check.role:user')->name('documentos.create');
            Route::get('documentos/{documento}', 'show')->middleware('check.role:user,admin,consultor')->name('documentos.show');
            Route::get('documentos/{documento}/edit', 'edit')->middleware('check.role:user,admin')->name('documentos.edit');
            Route::patch('documentos/{documento}', 'update')->middleware('check.role:user,admin')->name('documentos.update');
            Route::post('documentos', 'store')->middleware('check.role:user')->name('documentos.store');
            Route::delete('documentos/{documento}', 'destroy')->middleware('check.role:user,admin')->name('documentos.destroy');
        });

        // Alertas de prioridad
        Route::controller(AlertaController::class)
            ->middleware('check.role:user')
            ->prefix('alertas')
            ->name('alertas.')
            ->group(function (): void {
                Route::get('/', 'index')->name('index');
                Route::patch('{alerta}/leer', 'marcarLeida')->name('leer');
                Route::patch('leer-todas', 'marcarTodasLeidas')->name('leer-todas');
            });
    });

Route::prefix('consultor')
    ->name('consultor.')
    ->middleware(['auth', 'verified', 'ensure.approved', 'check.role:consultor,admin'])
    ->group(function () {
        Route::get('expedientes', [ConsultorController::class, 'index'])->name('expedientes.index');
        Route::post('movimientos/{movimiento}/recordar', [ConsultorController::class, 'recordar'])->name('movimientos.recordar');
    });

require __DIR__.'/settings.php';
