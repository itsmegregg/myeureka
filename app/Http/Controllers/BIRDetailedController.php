<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Models\BirDetailed; // Model for the bir_detailed summary table
use App\Http\Resources\BirDetailedCollection;

class BIRDetailedController extends Controller
{
    public function index(Request $request)
    {
        try {
            // Validate the request
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'terminal_number' => 'nullable|string',
                'payment_type' => 'nullable|string',
                'from_date' => 'required|date',
                'to_date' => 'required|date',
                'per_page' => 'nullable|integer|min:1',
                'page' => 'nullable|integer|min:1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Build a simpler query using the BirDetailed model
            $query = BirDetailed::whereBetween('date', [$request->from_date, $request->to_date]);

            // Apply branch_name filter if not 'ALL'
            if ($request->branch_name && strtoupper($request->branch_name) !== 'ALL') {
                $query->where('branch_name', $request->branch_name);
            }

            // Apply store_name filter if not 'ALL'
            if ($request->store_name && strtoupper($request->store_name) !== 'ALL') {
                $query->where('store_name', $request->store_name);
            }

            // Apply terminal_number filter if not 'ALL'
            if ($request->terminal_number && strtoupper($request->terminal_number) !== 'ALL') {
                $query->where('terminal_number', $request->terminal_number);
            }
            
            // Apply payment_type filter if not 'ALL'
            if ($request->payment_type && strtoupper($request->payment_type) !== 'ALL') {
                // Using FIND_IN_SET or LIKE for filtering within concatenated payment types
                $query->where(function($q) use ($request) {
                    $paymentType = $request->payment_type;
                    // Look for the exact payment type in the comma-separated list
                    $q->whereRaw("FIND_IN_SET(?, payment_type)", [$paymentType])
                      ->orWhere('payment_type', 'LIKE', "%{$paymentType},%")
                      ->orWhere('payment_type', 'LIKE', "%,{$paymentType}%")
                      ->orWhere('payment_type', '=', $paymentType);
                });
            }

            // Order by date and SI number
            $query->orderBy('date')
                  ->orderBy('si_number');

            // Paginate the results
            $perPage = $request->input('per_page', 15);
            $birDetailed = $query->paginate($perPage);

            // Transform the data to ensure field naming consistency with the frontend
            $data = $birDetailed->getCollection()->map(function ($item) {
                return [
                    'branch_name' => $item->branch_name,
                    'store_name' => $item->store_name,
                    'terminal_number' => $item->terminal_number,
                    'date' => \Carbon\Carbon::parse($item->date)->format('Y-m-d'),  // Format the date here
                    'si_number' => $item->si_number,
                    'vat_exempt_sales' => (float) $item->vat_exempt_sales,
                    'zero_rated_sales' => (float) $item->zero_rated_sales,
                    'vat_amount' => (float) $item->vat_amount,
                    'less_vat' => (float) $item->less_vat,
                    'gross_amount' => (float) $item->gross_amount,
                    'discount_code' => $item->discount_code,
                    'discount_amount' => (float) $item->discount_amount,
                    'net_total' => (float) $item->net_total,
                    'payment_type' => $item->payment_type,
                    'amount' => (float) $item->amount
                ];
            });

            // Return the data with pagination metadata
            return response()->json([
                'status' => 'success',
                'data' => $data,
                'meta' => [
                    'current_page' => $birDetailed->currentPage(),
                    'from' => $birDetailed->firstItem(),
                    'last_page' => $birDetailed->lastPage(),
                    'path' => $birDetailed->path(),
                    'per_page' => $birDetailed->perPage(),
                    'to' => $birDetailed->lastItem(),
                    'total' => $birDetailed->total()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch BIR detailed data: ' . $e->getMessage()
            ], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'terminal_number' => 'nullable|string',
                'payment_type' => 'nullable|string',
                'from_date' => 'required|date',
                'to_date' => 'required|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Build a simpler query using the BirDetailed model
            $query = BirDetailed::whereBetween('date', [$request->from_date, $request->to_date]);

            if ($request->branch_name && strtoupper($request->branch_name) !== 'ALL') {
                $query->where('branch_name', $request->branch_name);
            }

            if ($request->store_name && strtoupper($request->store_name) !== 'ALL') {
                $query->where('store_name', $request->store_name);
            }
            
            // Apply terminal_number filter if not 'ALL'
            if ($request->terminal_number && strtoupper($request->terminal_number) !== 'ALL') {
                $query->where('terminal_number', $request->terminal_number);
            }
            
            // Apply payment_type filter if not 'ALL'
            if ($request->payment_type && strtoupper($request->payment_type) !== 'ALL') {
                // Using FIND_IN_SET or LIKE for filtering within concatenated payment types
                $query->where(function($q) use ($request) {
                    $paymentType = $request->payment_type;
                    // Look for the exact payment type in the comma-separated list
                    $q->whereRaw("FIND_IN_SET(?, payment_type)", [$paymentType])
                      ->orWhere('payment_type', 'LIKE', "%{$paymentType},%")
                      ->orWhere('payment_type', 'LIKE', "%,{$paymentType}%")
                      ->orWhere('payment_type', '=', $paymentType);
                });
            }

            // Order by date and SI number
            $query->orderBy('date')
                  ->orderBy('si_number');

            // Get all results without pagination for export
            $results = $query->get();
            
            // Transform the data to maintain consistency with frontend expectations
            $data = $results->map(function ($item) {
                return [
                    'branch_name' => $item->branch_name,
                    'store_name' => $item->store_name,
                    'date' => $item->date,
                    'si_number' => $item->si_number,
                    'vat_exempt_sales' => (float) $item->vat_exempt_sales,
                    'zero_rated_sales' => (float) $item->zero_rated_sales,
                    'vat_amount' => (float) $item->vat_amount,
                    'less_vat' => (float) $item->less_vat,
                    'gross_amount' => (float) $item->gross_amount,
                    'discount_code' => $item->discount_code,
                    'discount_amount' => (float) $item->discount_amount,
                    'net_total' => (float) $item->net_total,
                    'payment_type' => $item->payment_type,
                    'amount' => (float) $item->amount
                ];
            });

            // Return all data without pagination metadata
            return response()->json([
                'status' => 'success',
                'data' => $data
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch BIR detailed data for export: ' . $e->getMessage()
            ], 500);
        }
    }
}
