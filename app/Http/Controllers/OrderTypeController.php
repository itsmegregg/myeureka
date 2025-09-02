<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderTypeController extends Controller
{
    public function GetOrderType(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'from_date' => 'required|date',
                'to_date' => 'required|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $query = \Illuminate\Support\Facades\DB::table('header')
                ->join('branches', 'header.branch_name', '=', 'branches.branch_name')
                ->join('stores', 'header.store_name', '=', 'stores.store_name')
                ->whereBetween('header.date', [$request->from_date, $request->to_date])
                ->where(function ($query) {
                    $query->where('header.void_flag', '!=', '1')
                          ->orWhereNull('header.void_flag');
                });

            if ($request->filled('branch_name') && $request->branch_name !== 'ALL') {
                $query->where('header.branch_name', $request->branch_name);
            }

            if ($request->filled('store_name') && $request->store_name !== 'ALL') {
                $query->where('header.store_name', $request->store_name);
            }

            if ($request->input('merge', 'true') === 'true') {
                $orderTypes = $query->select('transaction_type', \Illuminate\Support\Facades\DB::raw('count(*) as transaction_count'))
                    ->groupBy('transaction_type')
                    ->get();
            } else {
                $orderTypes = $query->select('header.date', 'transaction_type', \Illuminate\Support\Facades\DB::raw('count(*) as transaction_count'))
                    ->groupBy('header.date', 'transaction_type')
                    ->orderBy('header.date')
                    ->get();
            }

            return response()->json([
                'status' => 'success',
                'data' => $orderTypes,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Internal Server Error',
                'errors' => $e->getMessage(),
            ], 500);
        }
    }
}
