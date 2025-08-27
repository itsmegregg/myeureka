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
            
            // Calculate Average Sales Per Customer
            $totals = Header::query()
                ->select(
                    DB::raw('SUM(header.net_amount + header.service_charge) as total_amount'),
                    DB::raw('SUM(header.guest_count) as total_guests')
                )
                ->whereBetween('header.date', [$startDate, $endDate])
                ->when($concept_name !== 'ALL' && $concept_name !== null, function ($query) use ($concept_name) {
                    $query->where('header.store_name', $concept_name);
                })
                ->when($branch_name !== 'ALL' && $branch_name !== null, function ($query) use ($branch_name) {
                    $query->where('header.branch_name', $branch_name);
                })
                ->first();
                
            $totalSales = $totals->total_amount ?? 0;
            $totalGuests = $totals->total_guests ?? 0;
            $averageSalesPerCustomer = $totalGuests != 0 ? round($totalSales / $totalGuests, 2) : 0;
            
            // Calculate Average Sales Per Day
            $averageSalesQuery = Header::query()
                ->join('item_details', function ($join) {
                    $join->on('header.si_number', '=', 'item_details.si_number')
                         ->on('header.terminal_number', '=', 'item_details.terminal_number')
                         ->on('header.branch_name', '=', 'item_details.branch_name');
                })
                ->whereBetween('header.date', [$startDate, $endDate]);

            // Only apply filters if not 'ALL'
            if ($branch_name !== 'ALL' && $branch_name !== null) {
                $averageSalesQuery->where('header.branch_name', $branch_name);
            }

            if ($concept_name !== 'ALL' && $concept_name !== null) {
                $averageSalesQuery->where('header.store_name', $concept_name);
            }

            $averageSales = $averageSalesQuery->selectRaw(' 
                SUM(item_details.net_total) as total_sales,
                COUNT(DISTINCT header.date) as total_days,
                (SUM(item_details.net_total) / COUNT(DISTINCT header.date)) AS average_sales
            ')->first();
            
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
                    DB::raw('DATE_FORMAT(header.date, "%d %b") as date_formatted'),
                    DB::raw('SUM(header.net_amount + header.service_charge) as total_sales')
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
                         ->on('payment_details.terminal_number', '=', 'header.terminal_number')
                         ->on('payment_details.branch_name', '=', 'header.branch_name');
                })
                ->select(
                    'payment_details.payment_type',
                    DB::raw('SUM(payment_details.amount) as amount')
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
