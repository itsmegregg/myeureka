<?php

namespace App\Http\Controllers\Api;

use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;

class ReceiptController extends Controller
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
        // Log request for debugging
        \Log::info('Receipt upload attempt', [
            'has_file' => $request->hasFile('file'),
            'file_name' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'none',
            'branch_name' => $request->branch_name,
            'type' => $request->type,
        ]);

        // Handle file upload to public folder (like images)
        $validator = Validator::make($request->all(), [
            'file' => [
                'required',
                'file',
                function ($attribute, $value, $fail) {
                    $extension = strtolower($value->getClientOriginalExtension());
                    if (!in_array($extension, ['txt', 'log'])) {
                        $fail('The file must be a TXT or LOG file.');
                    }
                },
                'max:2048'
            ],
            'branch_name' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
        ]); 

        if ($validator->fails()) {
            \Log::warning('Receipt validation failed', ['errors' => $validator->errors()]);
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Handle file upload to public folder
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            
            \Log::info('Processing file upload', [
                'original_name' => $file->getClientOriginalName(),
                'extension' => $file->getClientOriginalExtension(),
                'size' => $file->getSize()
            ]);

            // Use original filename
            $filename = $file->getClientOriginalName();
            
            // Ensure storage directory exists
            $storagePath = storage_path('app/public/receipts');
            if (!file_exists($storagePath)) {
                mkdir($storagePath, 0755, true);
            }
            
            // Store in public/receipts folder (like images)
            $path = $file->storeAs('receipts', $filename, 'public');
            
            \Log::info('File stored successfully', ['path' => $path]);

            // Parse filename components
            // Format: SI_NUMBER - DATE - BRANCH_NAME.TXT
            $filenameParts = pathinfo($filename, PATHINFO_FILENAME);
            $parts = explode(' - ', $filenameParts);
            
            $siNumber = $parts[0] ?? '';
            $date = $parts[1] ?? '';
            $branchName = $parts[2] ?? '';

            // Create receipt record with parsed components
            $receipt = Receipt::create([
                'si_number' => $siNumber,
                'file_path' => $path,
                'date' => $date,
                'branch_name' => $branchName,
                'type' => $request->type,
            ]);

            \Log::info('Receipt saved successfully', ['id' => $receipt->id]);

            return response()->json([
                'message' => 'Receipt file uploaded successfully!',
                'data' => $receipt,
                'file_url' => asset('storage/' . $path)
            ], 201);
        }

    } catch (\Exception $e) {
        \Log::error('Receipt upload error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'message' => 'Error uploading receipt file',
            'error' => $e->getMessage(),
            'details' => config('app.debug') ? $e->getTraceAsString() : 'Please check logs'
        ], 500);
    }
}
    /**
     * Display the specified resource.
     */
    public function show(Receipt $receipt)
    {
        return response()->json([
            'data' => $receipt
        ]);
    }


    
    /**
     * Remove the specified resource from storage.
     */
    public function searchViaSiNumber(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'si_number' => 'required|string|max:255',
            'branch_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        $receipt = Receipt::where('si_number', $request->si_number)
            ->where('branch_name', $request->branch_name)
            ->first();

        if ($receipt) {
            return response()->json([
                'message' => 'Receipt found!',
                'data' => $receipt
            ], 200);
        } else {
            return response()->json([
                'message' => 'Receipt not found',
                'data' => null
            ], 404);
        }
    }
}
