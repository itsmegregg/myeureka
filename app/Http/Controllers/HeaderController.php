<?php

namespace App\Http\Controllers;

use App\Models\Header;
use App\Models\ItemDetails;
use App\Models\Branch;
use App\Models\Concept;
use App\Http\Resources\DailySalesReportCollection;
use App\Http\Resources\DailySalesReportResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

class HeaderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
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
    public function show(Header $header)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Header $header)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Header $header)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Header $header)
    {
        //
    }

    public function DailySalesReport(Request $request)
    {
        $startDate = $request->input('from_date');
        $endDate = $request->input('to_date');
        $branch = strtoupper($request->input('branch_id', 'ALL'));
        $concept = strtoupper($request->input('concept_id', 'ALL'));
        $perPage = $request->input('per_page', 15); // Default to 15 items per page
        $page = $request->input('page', 1); // Default to page 1

        \Log::info('DailySalesReport request params', [
            'from_date' => $startDate,
            'to_date' => $endDate,
            'branch_id' => $branch,
            'concept_id' => $concept,
            'per_page' => $perPage,
            'page' => $page
        ]);
    
        // Retrieve sales data using Eloquent
        $salesData = \DB::table('header')
            ->select(
                'header.date',
                'header.branch_code',
                'branch.branch_name',  
                'header.si_number',
                'header.beg_balance',
                'header.end_balance',
                'header.no_transaction',
                'header.reg_guest',
                'header.ftime_guest',
                'header.no_void',
                'header.senior_disc',
                'header.pwd_disc',
                'header.other_disc',
                'header.open_disc',
                'header.employee_disc',
                'header.vip_disc',
                'header.promo_disc',
                'header.free_disc',
                'header.z_count',
                \DB::raw('SUM(item_details.gross_total) AS total_gross'), // Changed item_sales.total_gross to item_details.gross_total
                \DB::raw('SUM(item_details.service_charge) AS service_charge'),
                \DB::raw('SUM(item_details.net_total) AS net_sales') // Changed item_sales.net_sales to item_details.net_total
            )
            ->leftJoin('item_details', function ($join) { // Changed item_sales to item_details
                $join->on('header.si_number', '=', 'item_details.si_number') // Join on si_number, terminal_number, branch_code
                     ->on('header.terminal_number', '=', 'item_details.terminal_number')
                     ->on('header.branch_code', '=', 'item_details.branch_code');
            })
            ->leftJoin('branch', 'header.branch_code', '=', 'branch.branch_code')  // Changed branches to branch and branch_id to branch_code
            ->whereBetween('header.date', [$startDate, $endDate]);
    
        // Add additional conditions based on the branch value
        if ($branch != "ALL" && !empty($branch)) {
            $salesData->where('header.branch_code', $branch); // Changed branch_id to branch_code
        }

        if ($concept != "ALL" && !empty($concept)) {
            $salesData->where('header.store_code', $concept); // Changed concept_id to store_code
        }
    
        // Group by clauses
        $salesData->groupBy(
            'header.date',
            'header.branch_code',
            'branch.branch_name',
            'header.si_number',
            'header.beg_balance',
            'header.end_balance',
            'header.no_transaction',
            'header.reg_guest',
            'header.ftime_guest',
            'header.no_void',
            'header.senior_disc',
            'header.pwd_disc',
            'header.other_disc',
            'header.open_disc',
            'header.employee_disc',
            'header.vip_disc',
            'header.promo_disc',
            'header.free_disc',
            'header.z_count'
        );
        
        // Create a clone of the query for grand totals
        $grandTotalsQuery = clone $salesData;
        
        // Get the count of distinct dates between the date range for accurate pagination
        $countQuery = \DB::table('header')
            ->select('date', 'branch_code') // Changed branch_id to branch_code
            ->distinct()
            ->whereBetween('date', [$startDate, $endDate]);
            
        if ($branch != "ALL" && !empty($branch)) {
            $countQuery->where('branch_code', $branch); // Changed branch_id to branch_code
        }
        
        if ($concept != "ALL" && !empty($concept)) {
            $countQuery->where('store_code', $concept); // Changed concept_id to store_code
        }
        
        $totalRows = $countQuery->count();
        
        \Log::info('DailySalesReport actual count', [
            'count_method' => 'distinct_date_branch_count',
            'total_rows' => $totalRows,
            'date_range' => [$startDate, $endDate]
        ]);
        
        // Calculate grand totals from all records (not just the current page)
        $grandTotals = [
            'no_transaction' => 0, 
            'reg_guest' => 0,
            'ftime_guest' => 0,
            'no_void' => 0,
            'senior_disc' => 0,
            'pwd_disc' => 0,
            'other_disc' => 0,
            'open_disc' => 0,
            'employee_disc' => 0,
            'vip_disc' => 0,
            'promo_disc' => 0,
            'free_disc' => 0,
            'z_count' => 0,
            'service_charge' => 0,
            'total_gross' => 0,
            'net_sales' => 0,
            'total_sales' => 0,
        ];
        
        // Fetch all records for totals calculation
        $allRecords = $grandTotalsQuery->get();
        
        foreach ($allRecords as $record) {
            $grandTotals['no_transaction'] += $record->no_transaction;
            $grandTotals['reg_guest'] += $record->reg_guest;
            $grandTotals['ftime_guest'] += $record->ftime_guest;
            $grandTotals['no_void'] += $record->no_void;
            $grandTotals['senior_disc'] += (float)$record->senior_disc;
            $grandTotals['pwd_disc'] += (float)$record->pwd_disc;
            $grandTotals['other_disc'] += (float)$record->other_disc;
            $grandTotals['open_disc'] += (float)$record->open_disc;
            $grandTotals['employee_disc'] += (float)$record->employee_disc;
            $grandTotals['vip_disc'] += (float)$record->vip_disc;
            $grandTotals['promo_disc'] += (float)$record->promo_disc;
            $grandTotals['free_disc'] += (float)$record->free_disc;
            $grandTotals['z_count'] += (int)$record->z_count;
            // Handle already formatted strings by removing commas before conversion
            $service_charge = $record->service_charge;
            if (is_string($service_charge)) {
                $service_charge = str_replace(',', '', $service_charge);
            }
            $total_gross = $record->total_gross;
            if (is_string($total_gross)) {
                $total_gross = str_replace(',', '', $total_gross);
            }
            $net_sales = $record->net_sales;
            if (is_string($net_sales)) {
                $net_sales = str_replace(',', '', $net_sales);
            }
            
            $grandTotals['service_charge'] += (float)$service_charge;
            $grandTotals['total_gross'] += (float)$total_gross;
            $grandTotals['net_sales'] += (float)$net_sales;
            // Set total_sales to be the same as net_sales
            $net_sales_value = (float)$net_sales;
            $grandTotals['total_sales'] += $net_sales_value;
        }
    
        // Paginate the results
        $total = $totalRows; // Use our correctly calculated total
        
        \Log::info('DailySalesReport response pagination data', [
            'total' => $total,
            'expected_pages' => ceil($total / $perPage)
        ]);
        
        $result = $salesData->skip(($page - 1) * $perPage)
                           ->take($perPage)
                           ->get();

        // Calculate pagination metadata
        $lastPage = ceil($total / $perPage);
    
        // Format numerical values to two decimal places
        foreach ($result as $row) {
            // Store raw values before formatting
            $netSalesValue = $row->net_sales;
            
            // Format values
            $row->total_gross = number_format((float)$row->total_gross, 2);
            $row->service_charge = number_format((float)$row->service_charge, 2);
            $row->net_sales = number_format((float)$netSalesValue, 2);
            $row->total_sales = number_format((float)$netSalesValue, 2); // Set total_sales equal to net_sales
        }
        
        // Format grand total values
        $grandTotals['senior_disc'] = number_format((float)$grandTotals['senior_disc'], 2);
        $grandTotals['pwd_disc'] = number_format((float)$grandTotals['pwd_disc'], 2);
        $grandTotals['other_disc'] = number_format((float)$grandTotals['other_disc'], 2);
        $grandTotals['open_disc'] = number_format((float)$grandTotals['open_disc'], 2);
        $grandTotals['employee_disc'] = number_format((float)$grandTotals['employee_disc'], 2);
        $grandTotals['vip_disc'] = number_format((float)$grandTotals['vip_disc'], 2);
        $grandTotals['promo_disc'] = number_format((float)$grandTotals['promo_disc'], 2);
        $grandTotals['free_disc'] = number_format((float)$grandTotals['free_disc'], 2);
        $grandTotals['service_charge'] = number_format((float)$grandTotals['service_charge'], 2);
        $grandTotals['total_gross'] = number_format((float)$grandTotals['total_gross'], 2);
        $grandTotals['net_sales'] = number_format((float)$grandTotals['net_sales'], 2);
        $grandTotals['total_sales'] = number_format((float)$grandTotals['total_sales'], 2);
    
        // Return response with pagination metadata and grand totals
        $response = [
            'data' => $result,
            'grand_totals' => $grandTotals,
            'meta' => [
                'current_page' => (int)$page,
                'per_page' => (int)$perPage,
                'total' => (int)$total,
                'last_page' => (int)$lastPage,
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total)
            ],
            'links' => [
                'first' => url()->current() . '?page=1',
                'last' => url()->current() . '?page=' . $lastPage,
                'prev' => $page > 1 ? url()->current() . '?page=' . ($page - 1) : null,
                'next' => $page < $lastPage ? url()->current() . '?page=' . ($page + 1) : null
            ]
        ];
        
        \Log::info('DailySalesReport response pagination data', [
            'meta' => $response['meta'],
            'result_count' => count($result)
        ]);
        
        return response()->json($response);
    }

    public function discountReport(Request $request)
    {
        try {
            // Validate request parameters
            $request->validate([
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date',
                'branch_id' => 'nullable',
                'concept_id' => 'nullable',
                'per_page' => 'nullable|integer|min:1|max:1000',
            ]);
            
            $perPage = $request->input('per_page', 15); // Default to 15 per page
            
            $query = ItemSales::query()
                ->select(
                    DB::raw('DATE(date) as transaction_date'),
                    DB::raw('ROUND(SUM(senior_disc), 2) as senior_disc'),
                    DB::raw('ROUND(SUM(pwd_disc), 2) as pwd_disc'),
                    DB::raw('ROUND(SUM(other_disc), 2) as other_disc'),
                    DB::raw('ROUND(SUM(open_disc), 2) as open_disc'),
                    DB::raw('ROUND(SUM(employee_disc), 2) as employee_disc'),
                    DB::raw('ROUND(SUM(vip_disc), 2) as vip_disc'),
                    DB::raw('ROUND(SUM(promo), 2) as promo'),
                    DB::raw('ROUND(SUM(free), 2) as free')
                );

            // Filter by date range - Using from_date and to_date to match frontend
            if ($request->has('from_date') && $request->has('to_date')) {
                $fromDate = $request->from_date;
                $toDate = $request->to_date;
                
                // Add time parts to ensure full day coverage
                $fromDate = $fromDate . ' 00:00:00';
                $toDate = $toDate . ' 23:59:59';
                
                Log::info("Date filter: {$fromDate} to {$toDate}");
                
                $query->whereRaw("date >= ? AND date <= ?", [$fromDate, $toDate]);
            }

            // Filter by concept if provided and not 'all'
            if ($request->has('concept_id') && $request->concept_id !== 'all' && $request->concept_id !== 'ALL') {
                $query->where('concept_id', $request->concept_id);
            }

            // Filter by branch if provided and not 'all'
            if ($request->has('branch_id') && $request->branch_id !== 'all' && $request->branch_id !== 'ALL') {
                $query->where('branch_id', $request->branch_id);
            }

            // Add proper grouping and ordering
            $query->groupBy(DB::raw('DATE(date)'))
                ->orderBy('transaction_date', 'asc');
                
            // Get paginated results
            $discountData = $query->paginate($perPage);

            // Return data with resource transformation
            return new \App\Http\Resources\DiscountReportCollection($discountData);

        } catch (\Exception $e) {
            Log::error('Error in discount report: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve discount data',
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : [],
            ], 500);
        }
    }
}
