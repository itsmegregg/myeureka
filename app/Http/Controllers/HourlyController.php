<?php

namespace App\Http\Controllers;

use App\Models\Header;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HourlyController extends Controller
{
   
    public function getHourlyData(Request $request)
    {
        try {
            // Validate request parameters
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'terminal_number' => 'nullable|string',
                'from_date' => 'required|date',
                'to_date' => 'required|date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Start with the base query on the header table
            $query = \Illuminate\Support\Facades\DB::table('header')
                ->join('branches', 'header.branch_name', '=', 'branches.branch_name')
                ->join('stores', 'header.store_name', '=', 'stores.store_name')
                ->whereBetween('header.date', [$request->from_date, $request->to_date]);

            if ($request->has('branch_name') && $request->branch_name !== 'ALL') {
                $query->where('header.branch_name', $request->branch_name);
            }

            if ($request->has('store_name') && $request->store_name !== 'ALL') {
                $query->where('header.store_name', $request->store_name);
            }

            if ($request->has('terminal_number') && $request->terminal_number !== 'ALL') {
                $query->where('header.terminal_number', $request->terminal_number);
            }

            $query->select(
                \Illuminate\Support\Facades\DB::raw('EXTRACT(HOUR FROM header.time) as hour'), // Extract hour from military time
                \Illuminate\Support\Facades\DB::raw("CASE
                    WHEN EXTRACT(HOUR FROM header.time) < 12 THEN CONCAT(EXTRACT(HOUR FROM header.time), ':00 AM - ', EXTRACT(HOUR FROM header.time) + 1, ':00 AM')
                    WHEN EXTRACT(HOUR FROM header.time) = 12 THEN '12:00 PM - 1:00 PM'
                    WHEN EXTRACT(HOUR FROM header.time) > 12 THEN CONCAT(EXTRACT(HOUR FROM header.time) - 12, ':00 PM - ', EXTRACT(HOUR FROM header.time) - 11, ':00 PM')
                END as hour_range"),
                \Illuminate\Support\Facades\DB::raw('COUNT(DISTINCT header.si_number) as no_trans'), // Count distinct SI numbers for transactions
                \Illuminate\Support\Facades\DB::raw('SUM(CASE WHEN CAST(header.void_flag AS INTEGER) = 1 THEN 1 ELSE 0 END) as no_void'), // Using 'void_flag' column for voids (assuming 1 means voided)
                \Illuminate\Support\Facades\DB::raw('COALESCE(SUM(CAST(header.net_amount AS NUMERIC)), 0) as sales_value'), // Using 'net_amount' for total sales
                \Illuminate\Support\Facades\DB::raw('COALESCE(SUM(CAST(header.total_discount AS NUMERIC)), 0) as discount_amount') // Using 'total_discount' for total discount
            )
            ->groupBy(
                \Illuminate\Support\Facades\DB::raw('EXTRACT(HOUR FROM header.time)'),
                \Illuminate\Support\Facades\DB::raw("CASE
                    WHEN EXTRACT(HOUR FROM header.time) < 12 THEN CONCAT(EXTRACT(HOUR FROM header.time), ':00 AM - ', EXTRACT(HOUR FROM header.time) + 1, ':00 AM')
                    WHEN EXTRACT(HOUR FROM header.time) = 12 THEN '12:00 PM - 1:00 PM'
                    WHEN EXTRACT(HOUR FROM header.time) > 12 THEN CONCAT(EXTRACT(HOUR FROM header.time) - 12, ':00 PM - ', EXTRACT(HOUR FROM header.time) - 11, ':00 PM')
                END")
            )
            ->orderBy(\Illuminate\Support\Facades\DB::raw('EXTRACT(HOUR FROM header.time)'));

            // Fetch the results
            $hourlyRecords = $query->get();

            // Return data directly as a simple JSON response
            return response()->json([
                'status' => 'success',
                'data' => $hourlyRecords
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in hourly sales report:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve hourly records',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
