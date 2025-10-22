<?php

namespace App\Http\Controllers\API;

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
                'amount' => 'required|numeric',
            ]);

            $stripLeadingZeros = static function (string $value): string {
                $normalized = ltrim($value, '0');

                return $normalized === '' ? '0' : $normalized;
            };

            $branchName = strtoupper(trim($validatedData['branch_name']));
            $storeName = strtoupper(trim($validatedData['store_name']));
            $terminalNumberRaw = trim($validatedData['terminal_number']);
            $siNumberRaw = trim($validatedData['si_number']);
            $paymentType = strtoupper(trim($validatedData['payment_type']));

            $normalizedTerminal = $stripLeadingZeros($terminalNumberRaw);
            $normalizedSi = $stripLeadingZeros($siNumberRaw);

            $existingPayment = PaymentDetail::query()
                ->whereRaw('TRIM(UPPER(branch_name)) = ?', [$branchName])
                ->whereRaw('TRIM(UPPER(store_name)) = ?', [$storeName])
                ->whereRaw('TRIM(UPPER(payment_type)) = ?', [$paymentType])
                ->whereRaw("regexp_replace(TRIM(terminal_number), '^0+', '') = ?", [$normalizedTerminal])
                ->whereRaw("regexp_replace(TRIM(CAST(si_number AS TEXT)), '^0+', '') = ?", [$normalizedSi])
                ->first();

            if ($existingPayment) {
                $existingPayment->update([
                    'branch_name' => $branchName,
                    'store_name' => $storeName,
                    'terminal_number' => $terminalNumberRaw,
                    'si_number' => $siNumberRaw,
                    'payment_type' => $paymentType,
                    'amount' => $validatedData['amount'],
                ]);

                $payment = $existingPayment->refresh();
            } else {
                $payment = PaymentDetail::create([
                    'branch_name' => $branchName,
                    'store_name' => $storeName,
                    'terminal_number' => $terminalNumberRaw,
                    'si_number' => $siNumberRaw,
                    'payment_type' => $paymentType,
                    'amount' => $validatedData['amount'],
                ]);
            }

            return response()->json([
                'message' => $existingPayment
                    ? 'Payment detail updated successfully'
                    : 'Payment detail created successfully',
                'data' => $payment
            ], $existingPayment ? 200 : 201);
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
