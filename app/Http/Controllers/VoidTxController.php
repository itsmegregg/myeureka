<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Support\Facades\Validator;

class VoidTxController extends Controller
{
    public function VoidTxData(Request $request)
    {
        try {
            
    
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'cashier_name' => 'nullable|string',
                'from_date' => 'required|date',
                'to_date' => 'required|date'
            ]);
    
            if ($validator->fails()) {
                \Log::error('Validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
    
            // Log the actual query being built
            \DB::enableQueryLog();
    
            $query = DB::table('header AS h')
                ->join('item_details AS id', function ($join) {
                    $join->on(DB::raw('CAST(h.si_number AS NUMERIC)'), '=', DB::raw('CAST(id.si_number AS NUMERIC)'))
                         ->on(DB::raw('CAST(h.terminal_number AS NUMERIC)'), '=', DB::raw('CAST(id.terminal_number AS NUMERIC)'))
                         ->on(DB::raw('TRIM(UPPER(h.branch_name))'), '=', DB::raw('TRIM(UPPER(id.branch_name))'))
                         ->on(DB::raw('TRIM(UPPER(h.store_name))'), '=', DB::raw('TRIM(UPPER(id.store_name))'));
                })
                ->select(
                    'h.store_name',
                    'h.branch_name',
                    'h.terminal_number',
                    'h.date',
                    'h.time',
                    'h.si_number',
                    'h.cashier_name',
                    DB::raw('CAST(SUM(CAST(id.void_amount AS NUMERIC)) AS DECIMAL(10,2)) AS total_void_amount_for_transaction'),
                    'h.approved_by',
                    'h.void_reason'
                )
                ->whereBetween(DB::raw('DATE(h.date)'), [$request->from_date, $request->to_date])
                ->whereRaw("NULLIF(TRIM(h.void_flag), '') IS NOT NULL")
                ->whereRaw("TRIM(h.void_flag) <> '0'");

            // Add conditions only if they're not 'ALL'
            if ($request->filled('branch_name') && strtoupper($request->branch_name) !== 'ALL') {
                $query->whereRaw('TRIM(UPPER(h.branch_name)) = ?', [strtoupper(trim($request->branch_name))]);
            }
            if ($request->filled('store_name') && strtoupper($request->store_name) !== 'ALL') {
                $query->whereRaw('TRIM(UPPER(h.store_name)) = ?', [strtoupper(trim($request->store_name))]);
            }
            if ($request->filled('cashier_name') && strtoupper($request->cashier_name) !== 'ALL') {
                $query->whereRaw('TRIM(UPPER(h.cashier_name)) = ?', [strtoupper(trim($request->cashier_name))]);
            }
    
            $voidTransactions = $query->groupBy(
                    'h.id',
                    'h.store_name',
                    'h.branch_name',
                    'h.terminal_number',
                    'h.date',
                    'h.time',
                    'h.si_number',
                    'h.cashier_name',
                    'h.approved_by',
                    'h.void_reason'
                )
                ->orderBy('h.branch_name')
                ->orderBy('h.date')
                ->orderBy('h.time')
         
                ->orderBy('h.si_number')
                ->get();
    
            // Log the actual SQL query
            \Log::info('SQL Query:', \DB::getQueryLog());
    
            return response()->json([
                'status' => 'success',
                'data' => $voidTransactions
            ]);
    
        } catch(\Exception $e) {
            \Log::error('Error in VoidTxData:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
