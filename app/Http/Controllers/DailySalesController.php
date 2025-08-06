<?php

namespace App\Http\Controllers;

use App\Models\Dsr;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class DailySalesController extends Controller
{
    public function getDailySalesData(Request $request)
    {
        try {
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
            
            // Extract request parameters
            $branchName = $request->input('branch_name');
            $storeName = $request->input('store_name');
            $terminalNumber = $request->input('terminal_number');
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            
            // Query the dsr summary table directly
            $query = Dsr::whereBetween('date', [$fromDate, $toDate]);
                
            // Add conditional filters if branch or store names are provided and not 'ALL'
            if ($request->filled('store_name') && strtoupper($request->store_name) !== 'ALL') {
                $query->where('store_name', $request->store_name);
            }

            // Filter by branch if provided and not 'all'
            if ($request->filled('branch_name') && strtoupper($request->branch_name) !== 'ALL') {
                $query->where('branch_name', $request->branch_name);
            }

            // Filter by terminal number if provided and not 'ALL'
            if ($request->filled('terminal_number') && strtoupper($request->terminal_number) !== 'ALL') {
                $query->where('terminal_no', $request->terminal_number);
            }
            
            // Order the results
            $query->orderBy('date')
                  ->orderBy('branch_name')
                  ->orderBy('store_name')
                  ->orderBy('terminal_no');
            
            // Execute the query and get all results
            $results = $query->get();
            
            // Calculate grand totals
            $grandTotalGrossSales = 0;
            $grandTotalNetSales = 0;
            $grandTotalServiceCharge = 0;
            $grandTotalVoidAmount = 0;
            $grandTotalTransactions = 0;
            $grandTotalGuests = 0;
            $grandTotalPWDDiscount = 0;
            $grandTotalSeniorDiscount = 0;
            $grandTotalNationalAthletesDiscount = 0;
            $grandTotalSoloParentDiscount = 0;
            $grandTotalValorDiscount = 0;
            $grandTotalOtherDiscounts = 0;

            foreach ($results as $item) {
                $grandTotalGrossSales += (float) $item->total_gross_sales;
                $grandTotalNetSales += (float) $item->total_net_sales_after_void;
                $grandTotalServiceCharge += (float) $item->total_service_charge;
                $grandTotalVoidAmount += (float) $item->total_void_amount;
                $grandTotalTransactions += (int) $item->number_of_transactions;
                $grandTotalGuests += (int) $item->number_of_guests;
                $grandTotalPWDDiscount += (float) $item->PWD_Discount;
                $grandTotalSeniorDiscount += (float) $item->Senior_Discount;
                $grandTotalNationalAthletesDiscount += (float) $item->National_Athletes_Discount;
                $grandTotalSoloParentDiscount += (float) $item->Solo_Parent_Discount;
                $grandTotalValorDiscount += (float) $item->Valor_Discount;
                $grandTotalOtherDiscounts += (float) $item->Other_Discounts;
            }

            // Return all data and grand totals in response
            return response()->json([
                'status' => 'success',
                'data' => $results,
                'grand_totals' => [
                    'total_gross_sales' => round($grandTotalGrossSales, 2),
                    'total_net_sales_after_void' => round($grandTotalNetSales, 2),
                    'total_service_charge' => round($grandTotalServiceCharge, 2),
                    'number_of_transactions' => $grandTotalTransactions,
                    'number_of_guests' => $grandTotalGuests,
                    'total_void_amount' => round($grandTotalVoidAmount, 2),
                    'PWD_Discount' => round($grandTotalPWDDiscount, 2),
                    'Senior_Discount' => round($grandTotalSeniorDiscount, 2),
                    'National_Athletes_Discount' => round($grandTotalNationalAthletesDiscount, 2),
                    'Solo_Parent_Discount' => round($grandTotalSoloParentDiscount, 2),
                    'Valor_Discount' => round($grandTotalValorDiscount, 2),
                    'Other_Discounts' => round($grandTotalOtherDiscounts, 2),
                ]
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while processing the request',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}