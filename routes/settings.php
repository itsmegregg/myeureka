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

    Route::get('settings/process-bir-summary', function () {
        return Inertia::render('settings/processBirSummary');
    })->name('settings.process-bir-summary');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('settings.password');
    Route::patch('settings/password', [PasswordController::class, 'update'])->name('settings.password.update');
});
    