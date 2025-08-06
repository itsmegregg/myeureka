<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/branch');

   Route::get('settings/branch', function () {
        return Inertia::render('settings/branch');
    })->name('settings.branch');
});
    