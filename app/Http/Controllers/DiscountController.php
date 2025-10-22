<?php

namespace App\Http\Controllers;

use App\Models\ItemDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\DiscountReportCollection;

class DiscountController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(ItemDetail $itemDetails)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ItemDetail $itemDetails)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ItemDetail $itemDetails)
    {
        //
    }

    public function discountReport(Request $request)
    {
        try {
            // Validate request parameters
            $request->validate([
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date',
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'terminal_number' => 'nullable|string',
            ]);

            $query = ItemDetail::query()
                ->select(
                    DB::raw('DATE(header.date) as transaction_date'), // Add daily date
                    'item_details.discount_code',
                    DB::raw('SUM(CAST(item_details.discount_amount AS NUMERIC)) as total_discount')
                )
                ->when($request->filled('terminal_number') && strtoupper($request->terminal_number) !== 'ALL', function ($query) use ($request) {
                    $query->whereRaw('UPPER(header.terminal_number) = ?', [strtoupper($request->terminal_number)]);
                })
                ->join('header', function ($join) {
                    $join->on('item_details.terminal_number', '=', 'header.terminal_number')
                         ->on('item_details.branch_name', '=', 'header.branch_name')
                         ->on(DB::raw('CAST(item_details.si_number AS BIGINT)'), '=', DB::raw('CAST(header.si_number AS BIGINT)'));
                })
                ->whereNotNull('item_details.discount_code') // Exclude NULL discount codes
                ->whereRaw("COALESCE(item_details.void_flag, '0') = '0'");

            // Filter by date range
            if ($request->has('from_date') && $request->has('to_date')) {
                $fromDate = $request->from_date . ' 00:00:00';
                $toDate = $request->to_date . ' 23:59:59';
                $query->whereBetween('header.date', [$fromDate, $toDate]);
            }

            // Filter by store if provided and not 'all'
            if ($request->filled('store_name') && strtoupper($request->store_name) !== 'ALL') {
                $query->whereRaw('UPPER(header.store_name) = ?', [strtoupper($request->store_name)]);
            }

            // Filter by branch if provided and not 'all'
            if ($request->filled('branch_name') && strtoupper($request->branch_name) !== 'ALL') {
                $query->whereRaw('UPPER(header.branch_name) = ?', [strtoupper($request->branch_name)]);
            }

            // Add proper grouping and ordering
            $query->groupBy(DB::raw('DATE(header.date)')) // Group by date first
                  ->groupBy('item_details.discount_code') // Then by discount code
                  ->orderBy('transaction_date', 'asc')    // Order by date
                  ->orderBy('item_details.discount_code', 'asc'); // Then by discount code

            // Get all results without pagination
            $discountData = $query->get();

            // Return raw JSON response
            return response()->json([
                'status' => 'success',
                'data' => $discountData,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve discount data',
                'error' => $e->getMessage(),
                // 'trace' => config('app.debug') ? $e->getTrace() : [],
            ], 500);
        }
    }
}
