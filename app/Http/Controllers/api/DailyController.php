<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DailySummary;
use App\Models\Branch;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class DailyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'terminal_no' => 'required|string',
            'date' => 'required|date',
            'si_from' => 'nullable|string',
            'si_to' => 'nullable|string',
            'new_grand_total' => 'nullable|string',
            'old_grand_total' => 'nullable|string',
            'z_read_counter' => 'nullable|string',
            'branch_name' => 'required|string',
            'store_name' => 'required|string',
        ]);
    
        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
    
        $validatedData = $validator->validated();
    
        try {
            // Check if record already exists with these key fields
            $existingRecord = DailySummary::where('branch_name', $validatedData['branch_name'])
                ->where('terminal_no', $validatedData['terminal_no'])
                ->where('date', $validatedData['date'])
                ->where('si_from', $validatedData['si_from'])
                ->where('store_name', $validatedData['store_name'] ?? '')
                ->first();
    
            if ($existingRecord) {
                // Update existing record
                $existingRecord->update($validatedData);
                return response()->json([
                    'data' => $existingRecord,
                    'message' => 'Daily summary updated successfully'
                ], 200);
            } else {
                // Create new record
                $dailySummary = DailySummary::create($validatedData);
                return response()->json([
                    'data' => $dailySummary,
                    'message' => 'Daily summary created successfully'
                ], 201);
            }
        } catch (\Exception $e) {
            Log::error('Daily Summary API Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred while processing your request',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Display the specified resource.
     */
    public function show(DailySummary $daily)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, DailySummary $daily)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(DailySummary $daily)
    {
        //
    }
}
