<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GovernmentDataController extends Controller
{
    public function requestData(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'nullable|string',
            'store_name' => 'nullable|string',
            'from_date' => 'required|date',
            'to_date' => 'required|date',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1',
            'all_data' => 'nullable'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $query = \Illuminate\Support\Facades\DB::table('government_discount');

        if ($request->has('branch_name') && $request->branch_name !== 'ALL') {
            $query->where('government_discount.branch_name', $request->branch_name);
        }

        if ($request->has('store_name') && $request->store_name !== 'ALL') {
            $query->where('government_discount.store_name', $request->store_name);
        }

        $query->whereBetween('government_discount.date', [$request->from_date, $request->to_date]);
        
        // Check if all_data is present, if so, get all records without pagination
        if ($request->has('all_data')) {
            $allData = $query->get();
            
            return response()->json([
                'status' => 'success',
                'data' => $allData,
                'pagination' => [
                    'total' => count($allData),
                    'count' => count($allData),
                    'per_page' => count($allData),
                    'current_page' => 1,
                    'total_pages' => 1
                ]
            ]);
        }
        
        // Otherwise, use pagination
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 15); // Default to 15 items per page
        $paginatedResult = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'status' => 'success',
            'data' => $paginatedResult->items(),
            'pagination' => [
                'total' => $paginatedResult->total(),
                'count' => $paginatedResult->count(),
                'per_page' => $paginatedResult->perPage(),
                'current_page' => $paginatedResult->currentPage(),
                'total_pages' => $paginatedResult->lastPage()
            ]
        ]);
    }
}
