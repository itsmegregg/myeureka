<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\GovernmentDiscount;
use Illuminate\Support\Facades\Log;

class GovernmentDiscountController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'required|string',
            'store_name' => 'required|string',
            'date' => 'required|date',
            'id_no' => 'nullable|string',
            'id_type' => 'nullable|string',
            'name' => 'nullable|string',
            'si_number' => 'required|string',
            'gross_amount' => 'nullable|string',
            'discount_amount' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
        
        $validatedData = $validator->validated();

        try {
            // Log the composite key being used for lookup
            Log::info('Attempting to find existing GovernmentDiscount record with:', [
                'branch_name' => $validatedData['branch_name'],
                'store_name' => $validatedData['store_name'],
                'date' => $validatedData['date'],
                'si_number' => $validatedData['si_number'],
            ]);

            // Check if record already exists with these key fields INCLUDING id_no for uniqueness
            $existingRecord = GovernmentDiscount::where('branch_name', $validatedData['branch_name'])
                ->where('store_name', $validatedData['store_name'])
                ->where('date', $validatedData['date'])
                ->where('si_number', $validatedData['si_number'])
                ->where('id_no', $validatedData['id_no'])
                ->first();

            // Log whether an existing record was found
            Log::info('Existing GovernmentDiscount record found:', [
                'found' => (bool)$existingRecord, 
                'id' => $existingRecord->id ?? 'N/A',
                'composite_key' => $validatedData['branch_name'] . '-' . 
                                 $validatedData['store_name'] . '-' . 
                                 $validatedData['date'] . '-' . 
                                 $validatedData['si_number'] . '-' . 
                                 $validatedData['id_no']
            ]);
            
                if($existingRecord){
                    // Update existing record
                    $existingRecord->update($validatedData);
                    return response()->json([
                        'message' => 'Government discount updated successfully',
                        'data' => $existingRecord
                    ], 200);
                }else{
   
            
                // Create new record
                $governmentDiscount = GovernmentDiscount::create($validatedData);
                return response()->json([
                    'data' => $governmentDiscount,
                    'message' => 'Government discount created successfully'
                ], 201);
                }
        } catch (\Exception $e) {
            Log::error('Government Discount API Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred while processing your request',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
