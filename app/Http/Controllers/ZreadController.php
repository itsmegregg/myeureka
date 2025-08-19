<?php

namespace App\Http\Controllers;

use App\Models\Zread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ZreadController extends Controller
{
    /**
     * Search Zreads by branch and date range.
     * Params:
     * - branch_name: string
     * - from_date: YYYY-MM-DD
     * - to_date: YYYY-MM-DD
     */
    public function searchByDateRange(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'nullable|string',
            'store_name' => 'nullable|string',
            'from_date' => 'required|date',
            'to_date' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $from = $request->from_date;
            $to = $request->to_date;

            if ($from > $to) { [$from, $to] = [$to, $from]; }

            // Build query first; only apply filters when not ALL
            $query = Zread::query()
                ->whereBetween('date', [$from, $to]);

            if ($request->filled('branch_name') && strtoupper($request->branch_name) !== 'ALL') {
                $query->where('branch_name', trim($request->branch_name));
            }

            // Note: zread table has no store_name column; ignore store_name filter

            $zreads = $query->orderBy('date', 'asc')->get();

            return response()->json([
                'message' => 'Zreads fetched successfully',
                'data' => $zreads,
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Zread date-range search error', [ 'error' => $e->getMessage() ]);
            return response()->json([
                'message' => 'Error searching zreads',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
