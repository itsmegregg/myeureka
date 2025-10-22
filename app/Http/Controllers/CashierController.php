<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class CashierController extends Controller
{
    public function CashierData(Request $request)
    {
        try {
            $cashierName = $request->input('cashier_name');
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'from_date' => 'required|date',
                'to_date' => 'required|date',
                'cashier_name' => 'nullable|string'
            ]);
    
            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            // Get the base data (sales summary by branch, store, date, terminal, cashier)
            $salesQuery = DB::table('header as h')
                ->leftJoin(DB::raw('(
                    SELECT
                        CAST(id.si_number AS NUMERIC) AS si_number,
                        CAST(id.terminal_number AS NUMERIC) AS terminal_number,
                        TRIM(UPPER(id.branch_name)) AS branch_name,
                        TRIM(UPPER(id.store_name)) AS store_name,
                        SUM(CAST(id.void_amount AS NUMERIC)) AS total_void_amount
                    FROM
                        item_details AS id
                    GROUP BY
                        CAST(id.si_number AS NUMERIC),
                        CAST(id.terminal_number AS NUMERIC),
                        TRIM(UPPER(id.branch_name)),
                        TRIM(UPPER(id.store_name))
                ) AS tis'), function($join) {
                    $join->on(DB::raw('CAST(h.si_number AS NUMERIC)'), '=', 'tis.si_number')
                        ->on(DB::raw('CAST(h.terminal_number AS NUMERIC)'), '=', 'tis.terminal_number')
                        ->on(DB::raw('TRIM(UPPER(h.branch_name))'), '=', 'tis.branch_name')
                        ->on(DB::raw('TRIM(UPPER(h.store_name))'), '=', 'tis.store_name');
                })
                ->select(
                    'h.branch_name',
                    'h.store_name',
                    DB::raw('DATE(h.date) as date'),
                    'h.terminal_number',
                    'h.cashier_name',
                    DB::raw('SUM(CAST(h.gross_amount AS NUMERIC)) - SUM(CAST(tis.total_void_amount AS NUMERIC)) as total_gross_amount'),
                    DB::raw('SUM(CAST(h.net_amount AS NUMERIC)) - SUM(CAST(tis.total_void_amount AS NUMERIC)) as total_net_amount'),
                    DB::raw('SUM(CAST(h.service_charge AS NUMERIC)) as total_service_charge'),
                    DB::raw('SUM(CAST(h.less_vat AS NUMERIC)) as total_less_vat'),
                    DB::raw('SUM(CAST(tis.total_void_amount AS NUMERIC)) as total_void_amount'),
                    DB::raw('COUNT(DISTINCT h.si_number) as tx_count')
                )
                ->whereBetween(DB::raw('DATE(h.date)'), [$request->from_date, $request->to_date]);
            
            // Add filters for branch_name and store_name if provided
            if ($request->has('branch_name') && $request->branch_name !== 'ALL') {
                $salesQuery->whereRaw('TRIM(UPPER(h.branch_name)) = ?', [strtoupper(trim($request->branch_name))]);
            }

            if ($request->has('store_name') && $request->store_name !== 'ALL') {
                $salesQuery->whereRaw('TRIM(UPPER(h.store_name)) = ?', [strtoupper(trim($request->store_name))]);
            }

            if ($cashierName && $cashierName !== 'ALL') {
                $salesQuery->whereRaw('TRIM(UPPER(h.cashier_name)) = ?', [strtoupper(trim($cashierName))]);
            }
            
            // Group by the required fields
            $salesQuery->groupBy(
                'h.branch_name',
                'h.store_name',
                DB::raw('DATE(h.date)'),
                'h.terminal_number',
                'h.cashier_name'
            );

            // Get all payment types for dynamic columns
            $paymentTypes = DB::table('payment_details')
                ->select('payment_type')
                ->distinct()
                ->orderBy('payment_type')
                ->pluck('payment_type')
                ->toArray();
                
            // Get payment data grouped by branch, store, date, terminal, cashier, payment_type
            $paymentData = DB::table('header as h')
                ->join('payment_details as pd', function($join) {
                    $join->on(DB::raw('CAST(h.si_number AS NUMERIC)'), '=', DB::raw('CAST(pd.si_number AS NUMERIC)'))
                        ->on(DB::raw('CAST(h.terminal_number AS NUMERIC)'), '=', DB::raw('CAST(pd.terminal_number AS NUMERIC)'))
                        ->on(DB::raw('TRIM(UPPER(h.branch_name))'), '=', DB::raw('TRIM(UPPER(pd.branch_name))'))
                        ->on(DB::raw('TRIM(UPPER(h.store_name))'), '=', DB::raw('TRIM(UPPER(pd.store_name))'));
                })
                ->select(
                    'h.branch_name',
                    'h.store_name',
                    DB::raw('DATE(h.date) as date'),
                    'h.terminal_number',
                    'h.cashier_name',
                    'pd.payment_type',
                    DB::raw('SUM(pd.amount) as total_amount')
                )
                ->whereBetween(DB::raw('DATE(h.date)'), [$request->from_date, $request->to_date]);
            
            // Add filters for branch_name and store_name if provided
            if ($request->has('branch_name') && $request->branch_name !== 'ALL') {
                $paymentData->where('h.branch_name', $request->branch_name);
            }

            if ($request->has('store_name') && $request->store_name !== 'ALL') {
                $paymentData->where('h.store_name', $request->store_name);
            }

            if ($cashierName && $cashierName !== 'ALL') {
                $paymentData->where('h.cashier_name', $cashierName);
            }
            
            $paymentData = $paymentData->groupBy(
                'h.branch_name',
                'h.store_name',
                DB::raw('DATE(h.date)'),
                'h.terminal_number',
                'h.cashier_name',
                'pd.payment_type'
            )->get();
            
            // Transform payment data into a lookup table
            $paymentLookup = [];
            foreach ($paymentData as $payment) {
                $key = $payment->branch_name . '|' . $payment->store_name . '|' . $payment->date . '|' . $payment->terminal_number . '|' . $payment->cashier_name;
                if (!isset($paymentLookup[$key])) {
                    $paymentLookup[$key] = [];
                }
                $paymentLookup[$key][] = [
                    'payment_type' => $payment->payment_type,
                    'amount' => $payment->total_amount
                ];
            }
            
            // Get sales data
            $salesData = $salesQuery->get();
            
            // Merge sales data with payment data
            $result = [];
            foreach ($salesData as $sale) {
                $key = $sale->branch_name . '|' . $sale->store_name . '|' . $sale->date . '|' . $sale->terminal_number . '|' . $sale->cashier_name;
                
                $row = [
                    'branch_name' => $sale->branch_name,
                    'store_name' => $sale->store_name,
                    'date' => $sale->date,
                    'terminal_number' => $sale->terminal_number,
                    'cashier_name' => $sale->cashier_name,
                    'total_gross_amount' => $sale->total_gross_amount,
                    'total_net_amount' => $sale->total_net_amount,
                    'total_service_charge' => $sale->total_service_charge,
                    'total_less_vat' => $sale->total_less_vat,
                    'total_void_amount' => $sale->total_void_amount,
                    'tx_count' => $sale->tx_count,
                    'sales_details' => isset($paymentLookup[$key]) ? $paymentLookup[$key] : [] 
                ];
                
                $result[] = $row;
            }
            
            return response()->json([
                'status' => 'success',
                'data' => $result,
                'payment_types' => $paymentTypes,
                'total_records' => count($result)
            ]);
                
        } catch(Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while processing your request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function index(){

        try{
            $cashiers = DB::table('header')->select('cashier_name', 'branch_name')->distinct()->get();
            return response()->json([
                'status' => 'success',
                'data' => $cashiers
            ]);
        }catch(Exception $e){
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while processing your request',
                'error' => $e->getMessage()
            ], 500);
        }   
    }
}
