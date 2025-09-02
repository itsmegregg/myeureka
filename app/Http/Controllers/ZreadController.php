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
            'branch_name' => 'nullable|string|max:255',
            'search_term' => 'nullable|string|max:255',
            'from_date' => 'required|date_format:Y-m-d',
            'to_date' => 'required|date_format:Y-m-d',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'page' => 'sometimes|integer|min:1'
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

            // Swap dates if from_date is after to_date
            if (strtotime($from) > strtotime($to)) {
                [$from, $to] = [$to, $from];
            }

            $query = Zread::query()
                ->whereBetween('date', [$from, $to])
                ->select([
                    'id',
                    'date',
                    'branch_name',
                    'file_name',
                    'file_content',
                    'mime_type',
                    'created_at',
                    'updated_at'
                ]);

            // Case-insensitive branch name search
            if ($request->filled('branch_name') && strtoupper($request->branch_name) !== 'ALL') {
                $branchName = trim($request->branch_name);
                $query->where('branch_name', 'ilike', "%{$branchName}%");
            }

            // Search within file content if search term provided
            if ($request->filled('search_term')) {
                $searchTerm = '%' . $request->search_term . '%';
                $query->where(function($q) use ($searchTerm) {
                    $q->where('file_name', 'ilike', $searchTerm)
                      ->orWhere('file_content', 'ilike', $searchTerm);
                });
            }

            // Paginate results
            $perPage = $request->input('per_page', 15);
            $zreads = $query->orderBy('date', 'desc')
                          ->orderBy('branch_name', 'asc')
                          ->paginate($perPage);

            return response()->json([
                'message' => 'Zreads fetched successfully',
                'data' => $zreads->items(),
                'pagination' => [
                    'total' => $zreads->total(),
                    'per_page' => $zreads->perPage(),
                    'current_page' => $zreads->currentPage(),
                    'last_page' => $zreads->lastPage(),
                ]
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
