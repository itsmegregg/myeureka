<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class FastMovingController extends Controller
{
    public function FastMovingData(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'from_date' => 'required|date',
                'to_date' => 'required|date',
                'category_code' => 'nullable|string'
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
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $categoryCode = $request->input('category_code');
            
            // Build the SQL query
            $query = DB::table('products as p')
                ->select(
                    'p.category_code',
                    'c.category_name',
                    'p.product_code',
                    'p.product_name',
                    'ss.total_quantity_sold'
                )
                ->leftJoin('categories as c', 'p.category_code', '=', 'c.category_code')
                ->leftJoinSub(function ($query) use ($fromDate, $toDate, $branchName, $storeName) {
                    $query->select(
                            'id.product_code',
                            DB::raw('SUM(CAST(id.qty AS INTEGER)) AS total_quantity_sold')
                        )
                        ->from('item_details', 'id')
                        ->join('header as h', function ($join) {
                            $join->on('id.si_number', '=', 'h.si_number')
                                 ->on('id.terminal_number', '=', 'h.terminal_number')
                                 ->on('id.branch_name', '=', 'h.branch_name')
                                 ->on('id.store_name', '=', 'h.store_name');
                        })
                        ->whereBetween(DB::raw('DATE(h.date)'), [$fromDate, $toDate])
                        ->where('h.void_flag', 0)
                        ->where('id.void_flag', 0);

                    if ($branchName) {
                        $query->where('h.branch_name', $branchName);
                    }

                    if ($storeName) {
                        $query->where('h.store_name', $storeName);
                    }

                    $query->groupBy('id.product_code');
                }, 'ss', function ($join) {
                    $join->on('p.product_code', '=', 'ss.product_code');
                })
                ->groupBy('p.category_code', 'c.category_name', 'p.product_code', 'p.product_name', 'ss.total_quantity_sold')
                ->orderByDesc('total_quantity_sold')
                ->orderBy('p.product_name')
                ->havingRaw('total_quantity_sold > 0');

            if ($categoryCode && $categoryCode !== 'ALL') {
                $query->where('p.category_code', $categoryCode);
            }

            // Log the query and bindings for debugging
            \Log::info('FastMoving Query: ' . $query->toSql());
            \Log::info('FastMoving Bindings: ' . json_encode($query->getBindings()));

            // Execute query
            $results = $query->get();
            
            return response()->json([
                'status' => 'success',
                'data' => $results
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
