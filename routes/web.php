<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

Route::get('/', function () {
    return redirect('/dashboard');
})->name('home');

// Add ValidateActiveSession middleware to all authenticated routes
Route::middleware(['auth', 'verified', \App\Http\Middleware\ValidateActiveSession::class])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard/index');
    })->name('dashboard');
    
    // Item sales routes - protected by auth middleware
    Route::get('item-sales/per-item', function () {
        return Inertia::render('itemSales/perItem');
    })->name('item-sales.per-item');
    
    Route::get('item-sales/per-category', function () {
        return Inertia::render('itemSales/perCategory');
    })->name('item-sales.per-category');
    
    // Additional protected routes
    Route::get('discount', function () {
        return Inertia::render('discount/index');
    })->name('discount');
    
    Route::get('payment', function () {
        return Inertia::render('payment/index');
    })->name('payment');
    
    Route::get('hourly', function () {
        return Inertia::render('hourly/index');
    })->name('hourly');
    
    // BIR Reports
    Route::get('bir/detailed', function () {
        return Inertia::render('birReport/birDetailed/index');
    })->name('bir.detailed');
    
    Route::get('bir/summary', function () {
        return Inertia::render('birReport/birSummary/index');
    })->name('bir.summary');
    
    // Other protected pages
    Route::get('void-tx', function () {
        return Inertia::render('voidtx/index');
    })->name('void-tx');
    
    Route::get('cashier', function () {
        return Inertia::render('cashier/index');
    })->name('cashier');
    
    Route::get('fast-moving', function () {
        return Inertia::render('fastMoving/index');
    })->name('fast-moving');
    
    Route::get('government-discount', function () {
        return Inertia::render('government/index');
    })->name('government-discount');
    
    Route::get('daily-sales', function () {
        return Inertia::render('dailySales/index');
    })->name('daily-sales');

    Route::get('receipt', function () {
        return Inertia::render('receipt/index');
    })->name('receipt');
});