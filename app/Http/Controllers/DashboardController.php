<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Header;
use App\Models\ItemDetails;
use App\Models\PaymentDetail;

/**
 * DashboardController handles all dashboard data requests
 * 
 * This controller now uses a consolidated approach where all dashboard data
 * is fetched from a single endpoint (getDashboardSummary) to improve performance
 * and reduce redundant API calls.
 */
class DashboardController extends Controller
{
    public function getDashboardSummary(Request $request)
    {
        try {
            $month = $request->query('month');
            $branch_name = strtoupper($request->query('branch_name', 'ALL'));
            $concept_name = strtoupper($request->query('concept_name', 'ALL'));
            
            if (empty($month)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Month parameter is required'
                ], 400);
            }
            
            // Get the month date range for better index usage
            $startDate = \Carbon\Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();
            $endDate = \Carbon\Carbon::createFromFormat('Y-m', $month)->endOfMonth()->toDateString();
            
            // Calculate total sales
            $totals = DB::table('header as h')
                ->join('payment_details as pd', function ($join) {
                    $join->on('h.si_number', '=', 'pd.si_number')
                         ->on('h.branch_name', '=', 'pd.branch_name')
                         ->on('h.store_name', '=', 'pd.store_name');
                })
                ->select(
                    DB::raw('SUM(CAST(pd.amount AS NUMERIC)) as total_amount')
                )
                ->whereBetween('h.date', [$startDate, $endDate])
                ->when($concept_name !== 'ALL' && $concept_name !== null, function ($query) use ($concept_name) {
                    $query->where('h.store_name', $concept_name);
                })
                ->when($branch_name !== 'ALL' && $branch_name !== null, function ($query) use ($branch_name) {
                    $query->where('h.branch_name', $branch_name);
                })
                ->whereNull('h.void_reason')
                ->first();
                
            // Get guest count with daily breakdown using GROUPING SETS
            $guestCountQuery = DB::table('header')
                ->select(
                    DB::raw('COALESCE(CAST(date AS text), \'Grand Total\') AS day'),
                    DB::raw('SUM(CAST(guest_count AS numeric)) AS total_guest_count')
                )
                ->whereBetween('date', [$startDate, $endDate])
                ->when($concept_name !== 'ALL' && $concept_name !== null, function ($query) use ($concept_name) {
                    $query->where('store_name', $concept_name);
                })
                ->when($branch_name !== 'ALL' && $branch_name !== null, function ($query) use ($branch_name) {
                    $query->where('branch_name', $branch_name);
                })
                ->whereNull('void_reason')
                ->groupByRaw('GROUPING SETS (date, ())')
                ->orderBy('day')
                ->get();
                
            // Extract the grand total (last record should be 'Grand Total')
            $totalGuests = 0;
            $dailyGuestCounts = [];
            
            foreach ($guestCountQuery as $record) {
                if ($record->day === 'Grand Total') {
                    $totalGuests = $record->total_guest_count;
                } else {
                    $dailyGuestCounts[] = [
                        'date' => $record->day,
                        'date_formatted' => \Carbon\Carbon::parse($record->day)->format('DD Mon'),
                        'total_guest_count' => $record->total_guest_count
                    ];
                }
            }
                
            $totalSales = $totals->total_amount ?? 0;
            $averageSalesPerCustomer = $totalGuests != 0 ? round($totalSales / $totalGuests, 2) : 0;
            
            // Calculate total days for average sales calculation
            $daysQuery = DB::table('header')
                ->selectRaw('COUNT(DISTINCT date) as total_days')
                ->whereBetween('date', [$startDate, $endDate])
                ->when($branch_name !== 'ALL' && $branch_name !== null, function ($query) use ($branch_name) {
                    $query->where('branch_name', $branch_name);
                })
                ->when($concept_name !== 'ALL' && $concept_name !== null, function ($query) use ($concept_name) {
                    $query->where('store_name', $concept_name);
                })
                ->whereNull('void_reason')
                ->first();
            
            $totalDaysForSales = $daysQuery->total_days ?? 0;
            $averageSalesPerDay = $totalDaysForSales > 0 ? round($totalSales / $totalDaysForSales, 2) : 0;
            
            $averageSales = (object)[
                'total_sales' => $totalSales,
                'total_days' => $totalDaysForSales,
                'average_sales' => $averageSalesPerDay
            ];
            
            // Calculate Average Transactions Per Day
            $averageTxQuery = Header::query()
                ->selectRaw('COUNT(*) as total_transactions, COUNT(DISTINCT date) as total_days')
                ->whereBetween('date', [$startDate, $endDate]);
                
            if ($branch_name !== 'ALL' && $branch_name !== null) {
                $averageTxQuery->where('branch_name', $branch_name);
            }
            
            if ($concept_name !== 'ALL' && $concept_name !== null) {
                $averageTxQuery->where('store_name', $concept_name);
            }
            
            $txData = $averageTxQuery->first();
            $totalTransactions = $txData->total_transactions ?? 0;
            $totalDays = $txData->total_days ?? 0;
            $averageTxPerDay = $totalDays > 0 ? round($totalTransactions / $totalDays, 2) : 0;
            
            // Format the month string
            $formattedMonth = \Carbon\Carbon::createFromFormat('Y-m', $month)->format('F Y');
            
            // Get daily sales data
            $dailySalesQuery = Header::query()
                ->select(
                    'header.date',
                    DB::raw('TO_CHAR(header.date, \'DD Mon\') as date_formatted'),
                    DB::raw('SUM(CAST(header.net_amount AS NUMERIC) + CAST(header.service_charge AS NUMERIC)) as total_sales')
                )
                ->whereBetween('header.date', [$startDate, $endDate])
                ->when($branch_name !== 'ALL' && $branch_name !== null, function ($query) use ($branch_name) {
                    $query->where('header.branch_name', $branch_name);
                })
                ->when($concept_name !== 'ALL' && $concept_name !== null, function ($query) use ($concept_name) {
                    $query->where('header.store_name', $concept_name);
                })
                ->groupBy('header.date')
                ->orderBy('header.date')
                ->get();

            // Get payment type data
            $paymentTypeQuery = PaymentDetail::query()
                ->join('header', function ($join) {
                    $join->on('payment_details.si_number', '=', 'header.si_number')
                         ->on('payment_details.branch_name', '=', 'header.branch_name');
                })
                ->select(
                    'payment_details.payment_type',
                    DB::raw('SUM(CAST(payment_details.amount AS NUMERIC)) as amount')
                )
                ->whereBetween('header.date', [$startDate, $endDate])
                ->when($branch_name !== 'ALL' && $branch_name !== null, function ($query) use ($branch_name) {
                    $query->where('payment_details.branch_name', $branch_name);
                })
                ->when($concept_name !== 'ALL' && $concept_name !== null, function ($query) use ($concept_name) {
                    $query->where('payment_details.store_name', $concept_name);
                })
                ->groupBy('payment_details.payment_type')
                ->orderBy('payment_details.payment_type')
                ->get();

            $paymentTypeData = $paymentTypeQuery->map(function ($item) {
                return [
                    'payment_type' => $item->payment_type,
                    'amount' => number_format($item->amount, 2)
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'average_sales_per_customer' => [
                        'average_sales_per_customer' => $averageSalesPerCustomer,
                        'total_sales' => round($totalSales, 2),
                        'total_guests' => $totalGuests,
                        'period' => [
                            'month' => $month,
                            'formatted_month' => $formattedMonth,
                            'branch' => $branch_name,
                            'concept' => $concept_name
                        ]
                    ],
                    'daily_guest_counts' => $dailyGuestCounts,
                    'average_sales_per_day' => [
                        'average_sales' => $averageSales ? round($averageSales->average_sales, 2) : 0,
                        'total_sales' => $averageSales ? round($averageSales->total_sales, 2) : 0,
                        'total_days' => $averageSales ? $averageSales->total_days : 0
                    ],
                    'average_tx_per_day' => [
                        'average_transaction_per_day' => $averageTxPerDay,
                        'total_transaction' => $totalTransactions,
                        'total_days' => $totalDays
                    ],
                    'total_sales' => [
                        'total_sales' => round($totalSales, 2),
                        'period' => [
                            'month' => $month,
                            'formatted_month' => $formattedMonth,
                            'branch' => $branch_name,
                            'store' => $concept_name
                        ]
                    ],
                    'daily_sales' => $dailySalesQuery,
                    'payment_types' => $paymentTypeData
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching dashboard summary', [
                'error' => $e->getMessage(),
                'params' => compact('month', 'branch_name', 'concept_name')
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch dashboard summary',
                'debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}


// WITH transaction_data AS (
//     SELECT 
//         MIN(CAST(si_from AS NUMERIC)) as min_si,
//         MAX(CAST(si_to AS NUMERIC)) as max_si,
//         COUNT(DISTINCT date) as total_days
//     FROM daily_summary
//     WHERE date BETWEEN '2025-08-01' AND '2025-08-30'
//       AND branch_name = 'DOUBLE DRAGON'  
//       AND store_name = 'RAMEN KURODA'
// )
// SELECT 
//     min_si,
//     max_si,
//     total_days,
//     (max_si - min_si) + 1 as total_transactions
// FROM transaction_data