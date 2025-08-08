<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ItemSalesController;
use App\Http\Controllers\HeaderController;
use App\Http\Controllers\PaymentDetailsController;
use App\Http\Controllers\HourlyController;
use App\Http\Controllers\BIRDetailedController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DiscountController;
use App\Http\Controllers\GovernmentDataController;


use App\Http\Controllers\BIRSummaryController;

use App\Http\Controllers\GovernmentDtaController;
use App\Http\Controllers\VoidTxController;
use App\Http\Controllers\CashierController;
use App\Http\Controllers\FastMovingController;
use App\Http\Controllers\DailySalesController;


use App\Http\Controllers\Auth\AuthenticatedSessionController;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Check session endpoint moved to auth.php with SessionController
// Route::middleware('auth:sanctum')->get('/check-session', function () {
//     return response()->json(['authenticated' => true]);
// });


Route::apiResource('store', StoreController::class);
Route::apiResource('branches', BranchController::class);
Route::apiResource('products', ProductController::class);
Route::apiResource('categories', CategoryController::class);    

//dashboard apis
Route::get('/dashboard/summary', [DashboardController::class, 'getDashboardSummary']);
Route::get('/sales/average-sales-per-day', [DashboardController::class, 'calculateAverageSalesPerDay']);
Route::get('/sales/average-tx-per-day', [DashboardController::class, 'CalculateAverageTxPerDay']);
Route::get('/sales/average-sales-per-customer', [DashboardController::class, 'getAverageSalesPerCustomer']);
Route::get('/sales/total-sales', [DashboardController::class, 'TotalSales']);
//charts apis
Route::get('/sales/total-sales-per-day', [DashboardController::class, 'totalSalesPerDay']);
Route::get('/sales/payment-chart', [DashboardController::class, 'PaymentTypeChart']);

//item sales apis
Route::get('/item-sales/product-mix', [ItemSalesController::class, 'ProductMix']);
Route::get('/item-sales/product-mix-all', [ItemSalesController::class, 'ProductMixAll']);

Route::get('/item-sales/category-mix-all', [ItemSalesController::class, 'productMixCategoryAll']);
Route::get('/item-sales/product-mix-category', [ItemSalesController::class, 'productMixCategory']);


//dailysales apis


Route::get('/sales/daily-report', [HeaderController::class, 'DailySalesReport']);

//discount apis
Route::get('/sales/discount-report', [DiscountController::class, 'discountReport']);

//payment details apis
Route::get('/sales/payment-details', [PaymentDetailsController::class, 'getPaymentData']);
Route::get('/sales/hourly-report', [HourlyController::class, 'getHourlyData']);

//bir detailed apis
Route::get('/bir/detailed-report', [BIRDetailedController::class, 'index']);
Route::get('/bir/detailed-report/export', [BIRDetailedController::class, 'export']);

//bir summary apis
Route::get('/bir/summary-report', [BIRSummaryController::class, 'getSummary']);

Route::get('/bir/summary-report/export', [BIRSummaryController::class, 'exportSummary'])
    ->middleware('auth:sanctum');

//api sending
Route::post('/daily-summary', [App\Http\Controllers\API\DailyController::class, 'store']);
Route::post('/item-details', [App\Http\Controllers\API\ItemDetailsController::class, 'store']);

Route::post('/header', [App\Http\Controllers\API\HeaderApiController::class, 'store']);
Route::post('/payment-details', [App\Http\Controllers\API\PaymentController::class, 'store']);
Route::post('/government', [App\Http\Controllers\API\GovernmentDiscountController::class, 'store']);

Route::get('/government-data', [GovernmentDataController::class, 'requestData']);
Route::get('/void-tx', [VoidTxController::class, 'VoidTxData']);
Route::get('/cashier', [CashierController::class, 'CashierData']);
Route::get('/fastmoving', [FastMovingController::class, 'FastMovingData']);
Route::get('/daily-sales', [DailySalesController::class, 'getDailySalesData']);

Route::get('/cashiers', [CashierController::class, 'index']);
Route::get('/payment-list', [PaymentDetailsController::class, 'paymentList']);

Route::post('/run-command', [App\Http\Controllers\API\UpdateCommandController::class, 'runCommand']);

//receipt data
Route::post('/receipt', [App\Http\Controllers\API\ReceiptController::class, 'store']);
Route::post('/receipts/search-via-si-number', [App\Http\Controllers\API\ReceiptController::class, 'searchViaSiNumber']);
Route::post('/receipts/search-by-date-range', [App\Http\Controllers\API\ReceiptController::class, 'searchByDateRange']);
Route::post('/receipts/download-consolidated', [App\Http\Controllers\API\ReceiptController::class, 'downloadConsolidated']);
// Route::get('/receipt', [ReceiptController::class, 'index']);

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth:sanctum');
