<?php

use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/appearance');
    Route::redirect('settings/profile', '/settings/appearance');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});
