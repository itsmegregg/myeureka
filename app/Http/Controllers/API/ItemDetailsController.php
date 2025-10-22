<?php

namespace App\Http\Controllers\API;

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
        'qty' => 'required|numeric',
        'net_total' => 'required|numeric',
        'menu_price' => 'required|numeric',
        'discount_code' => 'nullable|string',
        'discount_amount' => 'nullable|numeric',
        'combo_header' => 'nullable|string',
        'void_flag' => 'required|string',
        'void_amount' => 'nullable|numeric',
        'line_no' => 'required|numeric',
    ]);

    // Cast to correct types
    $validatedData['qty']             = (int)   $validatedData['qty'];
    $validatedData['si_number']       = (int)   $validatedData['si_number'];
    $validatedData['net_total']       = (float) $validatedData['net_total'];
    $validatedData['menu_price']      = (float) $validatedData['menu_price'];
    $validatedData['discount_amount'] = (float) ($validatedData['discount_amount'] ?? 0.00);
    $validatedData['void_amount']     = (float) ($validatedData['void_amount'] ?? 0.00);
    $validatedData['line_no']         = (int)   $validatedData['line_no'];

    try {
        \DB::beginTransaction();

        // Step 1: Category
        $existingCategory = \App\Models\Category::firstOrCreate([
            'category_name' => $validatedData['category_description'],
            'store_name' => $validatedData['store_name'],
        ], [
            'category_code' => $validatedData['category_code'],
            'category_description' => $validatedData['category_description'],
        ]);

        // Step 2: Product
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
        }

        // Step 3: ItemDetail
        $existingRecord = ItemDetail::where('branch_name', $validatedData['branch_name'])
            ->where('terminal_number', $validatedData['terminal_number'])
            ->where('si_number', $validatedData['si_number'])
            ->where('line_no', $validatedData['line_no'])
            ->where('store_name', $validatedData['store_name'])
            ->where('product_code', $validatedData['product_code'])
            ->first();

        if ($existingRecord) {
            $existingRecord->update($validatedData);
            \DB::commit();
            return response()->json([
                'data' => $existingRecord,
                'message' => 'Item details updated successfully',
                'categoryCreated' => !$existingCategory->wasRecentlyCreated,
                'productCreated' => !$existingProduct,
            ], 200);
        } else {
            $itemDetail = ItemDetail::create($validatedData);
            \DB::commit();
            return response()->json([
                'data' => $itemDetail,
                'message' => 'Item details created successfully',
                'categoryCreated' => !$existingCategory->wasRecentlyCreated,
                'productCreated' => !$existingProduct,
            ], 201);
        }
    } catch (\Exception $e) {
        \DB::rollBack();
        Log::error('Item Details API Error: ', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'request_data' => $request->all(),
        ]);
        return response()->json([
            'message' => 'An error occurred while processing your request',
            'error' => $e->getMessage(),
        ], 500);
    }
}
}