<?php

namespace App\Http\Controllers;

use App\Models\Zread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

            $fromDate = new \DateTimeImmutable($from);
            $toDate = new \DateTimeImmutable($to);


            // Swap dates if from_date is after to_date
            if ($fromDate > $toDate) {
                [$fromDate, $toDate] = [$toDate, $fromDate];
            }

            $from = $fromDate->format('Y-m-d');
            $to = $toDate->format('Y-m-d');

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

            // Get all results, sorted by date ascending
            $zreads = $query->orderBy('date', 'asc')
                          ->orderBy('branch_name', 'asc')
                          ->get();

            $response = [
                'message' => 'Zreads fetched successfully',
                'data' => $zreads,
            ];

            if ($from === $to) {
                // Get all branch names from the branches table
                $allBranches = DB::table('branches')->pluck('branch_name');

                // Get branch names that have Z-read data for the given date
                $branchesWithData = Zread::where('date', $from)->distinct()->pluck('branch_name');

                // Determine which branches do not have data
                $branchesWithoutData = $allBranches->diff($branchesWithData);

                $response['branch_count'] = $allBranches->count();
                $response['branch_count_that_have_a_date_result_of_zread'] = $branchesWithData->count();
                $response['branches_without_data'] = $branchesWithoutData->values()->all();
            }

            return response()->json($response, 200);
        } catch (\Exception $e) {
            \Log::error('Zread date-range search error', [ 'error' => $e->getMessage() ]);
            return response()->json([
                'message' => 'Error searching zreads',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
