<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\ItemDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ItemDetailsController extends Controller
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
    $validatedData = $request->validate([
        'branch_name' => 'required|string',
        'store_name' => 'required|string',
        'terminal_number' => 'required|string',
        'si_number' => 'required|string',
        'product_code' => 'required|string',
        'description' => 'required|string',
        'category_code' => 'required|string',
        'category_description' => 'required|string',
        'qty' => 'required|string',
        'net_total' => 'required|string',
        'menu_price' => 'required|string',
        'discount_code' => 'nullable|string',
        'discount_amount' => 'nullable|string',
        'combo_header' => 'nullable|string',
        'void_flag' => 'required|string',
        'void_amount' => 'nullable|string',
    ]);

    try {
        \DB::beginTransaction();
        
        // Step 1: Check if category exists, if not, create it - process category first
        $existingCategory = \App\Models\Category::firstOrCreate([
            'category_name' => $validatedData['category_description'],
            'store_name' => $validatedData['store_name'],
        ], [
            'category_code' => $validatedData['category_code'],
            'category_description' => $validatedData['category_description'],
        ]);
        
        if ($existingCategory->wasRecentlyCreated) {
            Log::info('New category created: ' . $validatedData['category_code']);
        } else {
            Log::info('Existing category found: ' . $validatedData['category_code']);
        }
        
        // Step 2: Check if product exists, if not, create it - process product after category
        $existingProduct = \App\Models\Product::where('product_code', $validatedData['product_code'])->first();
        if (!$existingProduct) {
            \App\Models\Product::create([
                'product_code' => $validatedData['product_code'],
                'category_code' => $existingCategory->category_code,
                'product_name' => $validatedData['description'],
                'product_description' => $validatedData['description'],
                'branch_name' => $validatedData['branch_name'],
                'store_name' => $validatedData['store_name'],
            ]);
            Log::info('New product created: ' . $validatedData['product_code']);
        }

        // Now process ItemDetails after category and product are handled
        // Step 3: Check if record already exists with these key fields
        $existingRecord = ItemDetail::where('branch_name', $validatedData['branch_name'])
            ->where('terminal_number', $validatedData['terminal_number'])
            ->where('si_number', $validatedData['si_number'])
            ->where('combo_header', $validatedData['combo_header'])
            ->where('store_name', $validatedData['store_name'])
            ->where('product_code', $validatedData['product_code'])
            ->first();

        if ($existingRecord) {
            // Update existing record
            $existingRecord->update($validatedData);
            \DB::commit();
            return response()->json([
                'data' => $existingRecord,
                'message' => 'Item details updated successfully',
                'categoryCreated' => !$existingCategory,
                'productCreated' => !$existingProduct
            ], 200);
        } else {
            // Create new record
            $itemDetail = ItemDetail::create($validatedData);
            \DB::commit();
            return response()->json([
                'data' => $itemDetail,
                'message' => 'Item details created successfully',
                'categoryCreated' => !$existingCategory,
                'productCreated' => !$existingProduct
            ], 201);
        }
    } catch (\Exception $e) {
        \DB::rollBack();
        
        // Capture the full exception details for debugging
        $errorDetail = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ];
        
        // Log comprehensive error information
        Log::error('Item Details API Error: ', $errorDetail);
        
        // Return detailed error information for debugging
        return response()->json([
            'message' => 'An error occurred while processing your request',
            'error' => $e->getMessage(),
            'details' => $errorDetail,
            'request_data' => $request->all() // Include the request data for context
        ], 500);
    }
}

   
}
