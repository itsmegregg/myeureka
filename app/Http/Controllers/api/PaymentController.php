<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentDetail;
use Illuminate\Http\Request;

class PaymentController extends Controller
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
            $validatedData = $request->validate([
                'branch_name' => 'required|string',
                'store_name' => 'required|string',
                'terminal_number' => 'required|string',
                'si_number' => 'required|string',
                'payment_type' => 'required|string',
                'amount' => 'required|string',
            ]);
    
            // Check if record already exists with these key fields
            $existingPayment = PaymentDetail::where('branch_name', $validatedData['branch_name'])
                ->where('store_name', $validatedData['store_name'])
                ->where('terminal_number', $validatedData['terminal_number'])
                ->where('si_number', $validatedData['si_number'])
                ->where('payment_type', $validatedData['payment_type'])
                ->first();
    
            if ($existingPayment) {
                // Update existing record
                $existingPayment->update($validatedData);
                return response()->json([
                    'message' => 'Payment detail updated successfully',
                    'data' => $existingPayment
                ], 200);
            } else {
                // Create new record
                $payment = PaymentDetail::create($validatedData);
                return response()->json([
                    'message' => 'Payment detail created successfully',
                    'data' => $payment
                ], 201);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error processing payment detail: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(PaymentDetail $paymentDetail)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PaymentDetail $paymentDetail)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PaymentDetail $paymentDetail)
    {
        //
    }
}
