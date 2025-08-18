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
            'branch_name' => 'required|string|max:255',
            'from_date' => 'required|date_format:Y-m-d',
            'to_date' => 'required|date_format:Y-m-d',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $branch = $request->branch_name;
            $from = $request->from_date;
            $to = $request->to_date;

            if ($from > $to) { [$from, $to] = [$to, $from]; }

            $zreads = Zread::where('branch_name', $branch)
                ->whereBetween('date', [$from, $to])
                ->orderBy('date', 'asc')
                ->get();

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
