<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Header;
use Illuminate\Http\Request;

class HeaderApiController extends Controller
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
        try {
            // Log the raw incoming request data for debugging
            \Log::info('Header raw request data received', $request->all());
            
            // Validate all incoming data
            $validatedData = $request->validate([
                'branch_name' => 'required|exists:branch,branch_name',
                'store_name' => 'required|exists:store,store_name',
                'terminal_number' => 'required|string',
                'si_number' => 'required|string',
                'date' => 'required|date',
                'time' => 'required',
                'transaction_type' => 'required|string',
                'void_flag' => 'required|string',
                'guest_count' => 'required|string',
                'male_count' => 'required|string',
                'female_count' => 'required|string',
                'guest_count_senior' => 'required|string',
                'guest_count_pwd' => 'required|string',
                'gross_amount' => 'required|string',
                'net_amount' => 'required|string',
                'vatable_sales' => 'required|string',
                'vat_amount' => 'required|string',
                'service_charge' => 'required|string',
                'tip' => 'required|string',
                'total_discount' => 'required|string',
                'less_vat' => 'required|string',
                'vat_exempt_sales' => 'required|string',
                'zero_rated_sales' => 'required|string',
                'delivery_charge' => 'nullable|string',
                'other_charges' => 'nullable|string',
                'cashier_name' => 'required|string',
                'approved_by' => 'nullable|string',
                'void_reason' => 'nullable|string',
            ]);
            
            // Check if a record with the same composite key already exists
            // This provides idempotent behavior - either update existing or create new
            $existingHeader = Header::where('branch_name', $validatedData['branch_name'])
                ->where('store_name', $validatedData['store_name'])
                ->where('terminal_number', $validatedData['terminal_number'])
                ->where('si_number', $validatedData['si_number'])
                ->where('date', $validatedData['date'])
                ->where('time', $validatedData['time'])
                ->first();
            
            \Log::info('Existing header check result: ', ['exists' => (bool)$existingHeader, 'id' => $existingHeader?->id ?? 'none']);
                
            \DB::beginTransaction();
            try {
                if ($existingHeader) {
                    // Update existing record
                    \Log::info('Updating existing header', ['id' => $existingHeader->id]);
                    $existingHeader->update($validatedData);
                    \DB::commit();
                    
                    return response()->json([
                        'message' => 'Header updated successfully',
                        'data' => $existingHeader,
                        'id' => $existingHeader->id
                    ], 200); // 200 OK for update
                } else {
                    // Create new record
                    \Log::info('Creating new header');
                    $header = Header::create($validatedData);
                    \Log::info('New header created successfully', ['id' => $header->id]);
                    \DB::commit();
                    
                    return response()->json([
                        'message' => 'Header created successfully',
                        'data' => $header,
                        'id' => $header->id
                    ], 201); // 201 Created for new record
                }
            } catch (\Exception $e) {
                \DB::rollBack();
                \Log::error('DB transaction failed: ' . $e->getMessage());
                throw $e;
            }
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Header processing error', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error processing header: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Display the specified resource.
     */
    public function show(Header $header)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Header $header)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Header $header)
    {
        //
    }
}
