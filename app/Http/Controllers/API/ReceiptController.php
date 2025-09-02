<?php

namespace App\Http\Controllers\API;

use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;

class ReceiptController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            // Log request for debugging
            \Log::info('Receipt upload attempt', [
                'has_file' => $request->hasFile('file'),
                'file_name' => $request->hasFile('file') 
                    ? $request->file('file')->getClientOriginalName() 
                    : ($request->file_name ?? 'none'),
                'branch_name' => $request->branch_name,
                'type' => $request->type,
            ]);

            $isFileUpload = $request->hasFile('file');
            $isDirectContent = $request->filled('file_content');

            // Validate request based on upload type
            $validator = Validator::make($request->all(), [
                'si_number' => 'required|string|max:255',
                'date' => 'required|string|max:20',
                'branch_name' => 'required|string|max:255',
                'store_name' => 'nullable|string|max:255',
                'type' => 'nullable|string|max:255',
                'file_name' => 'required|string|max:255',
                'mime_type' => 'nullable|string|max:100',
            ]);

            // Add file validation if it's a file upload
            if ($isFileUpload) {
                $validator->addRules([
                    'file' => [
                        'required',
                        'file',
                        'max:10240', // 10MB max
                    ]
                ]);
            } elseif ($isDirectContent) {
                $validator->addRules([
                    'file_content' => 'required|string',
                ]);
            } else {
                $validator->errors()->add('file', 'Either a file or file_content must be provided.');
            }

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation Error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $fileContent = '';
            $filename = $request->file_name;
            $mimeType = $request->mime_type ?: 'text/plain';
            $siNumber = $request->si_number;
            $date = $request->date;
            $branchName = $request->branch_name;
            $storeName = $request->store_name;
            $type = $request->type ?? 'general';

            if ($isFileUpload) {
                $file = $request->file('file');
                $fileContent = file_get_contents($file->getRealPath());
                $filename = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
            } else {
                $fileContent = $request->file_content;
            }

            // Create or update receipt
            $receipt = Receipt::updateOrCreate(
                [
                    'si_number' => $siNumber,
                    'date' => $date,
                    'branch_name' => $branchName,
                    'store_name' => $storeName,
                    'type' => $type,
                ],
                [
                    'file_name' => $filename,
                    'file_content' => $fileContent,
                    'mime_type' => $mimeType,
                ]
            );

            return response()->json([
                'message' => 'Receipt uploaded successfully',
                'data' => $receipt
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Receipt upload error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Error uploading receipt file',
                'error' => config('app.debug') ? $e->getMessage() : null,
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
     * Search receipts by SI number and branch
     */
    public function searchViaSiNumber(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'si_number' => 'required|string|max:255',
            'branch_name' => 'required|string|max:255',
            'store_name' => 'sometimes|required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $query = Receipt::where('si_number', $request->si_number)
                ->where('branch_name', $request->branch_name);

            if ($request->has('store_name') && $request->store_name !== 'ALL') {
                $query->where('store_name', $request->store_name);
            }

            $receipts = $query->orderBy('date', 'desc')->get();

            return response()->json([
                'data' => $receipts
            ]);

        } catch (\Exception $e) {
            \Log::error('Receipt search error', [
                'error' => $e->getMessage(),
                'si_number' => $request->si_number,
                'branch_name' => $request->branch_name
            ]);

            return response()->json([
                'message' => 'Error searching for receipt',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Search receipts by date range
     */
    public function searchByDateRange(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'required|string',
            'from_date' => 'required|date_format:Y-m-d',
            'to_date' => 'required|date_format:Y-m-d|after_or_equal:from_date',
            'store_name' => 'sometimes|required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $branch = $request->branch_name;
            $from = $request->from_date;
            $to = $request->to_date;
            
            if ($from > $to) {
                list($from, $to) = [$to, $from]; // Swap dates if from > to
            }

            $query = Receipt::select([
                'id',
                'si_number',
                'date',
                'branch_name',
                'file_name',
                'mime_type',
                'type',
                'created_at',
                'updated_at'
            ])
            ->whereBetween('date', [$from, $to]);

            if ($branch !== 'ALL') {
                $query->where('branch_name', $branch);
            }

            if ($request->has('store_name') && $request->store_name !== 'ALL') {
                $query->where('store_name', $request->store_name);
            }


            $receipts = $query->orderBy('date', 'asc')
                ->orderBy('si_number', 'asc')
                ->get();
            return response()->json([
                'data' => $receipts
            ]);

        } catch (\Exception $e) {
            \Log::error('Receipt date range search error', [
                'error' => $e->getMessage(),
                'branch' => $request->branch_name,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date
            ]);

            return response()->json([
                'message' => 'Error searching receipts by date range',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Download consolidated receipts as a single file
     */
    public function downloadConsolidated(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'required|string|max:255',
            'from_date' => 'required|date_format:Y-m-d',
            'to_date' => 'required|date_format:Y-m-d|after_or_equal:from_date',
            'store_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $branch = $request->branch_name;
            $from = $request->from_date;
            $to = $request->to_date;
            
            if ($from > $to) {
                list($from, $to) = [$to, $from]; // Swap dates if from > to
            }

            $query = Receipt::select([
                    'id',
                    'si_number',
                    'date',
                    'branch_name',
                    'store_name',
                    'file_content',
                    'file_name',
                    'mime_type',
                    'type',
                    'created_at',
                    'updated_at'
                ])
                ->whereBetween('date', [$from, $to]);

            if ($branch !== 'ALL') {
                $query->where('branch_name', $branch);
            }

            if ($request->has('store_name') && $request->store_name !== 'ALL') {
                $query->where('store_name', $request->store_name);
            }

            $receipts = $query->orderBy('date', 'asc')
                ->orderBy('si_number', 'asc')
                ->get();

            if ($receipts->isEmpty()) {
                return response()->json([
                    'message' => 'No receipts found for the selected range.',
                    'data' => []
                ], 404);
            }

            $lines = [];
            $separator = str_repeat('=', 80);
            
            foreach ($receipts as $receipt) {
                $header = $separator . "\n" .
                         "SI: {$receipt->si_number} | Branch: {$receipt->branch_name} | " .
                         "Date: {$receipt->date} | Type: " . ($receipt->type ?? 'general') . "\n" .
                         $separator . "\n";
                
                $content = $receipt->file_content ?? "[ERROR] No content available for this receipt\n";
                $lines[] = $header . $content . "\n\n";
            }

            $combined = implode("", $lines);
            $filename = 'receipts-' . preg_replace('/[^A-Za-z0-9_-]+/', '_', $branch) . "-{$from}-{$to}.txt";

            return response($combined, 200, [
                'Content-Type' => 'text/plain; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"'
            ]);

        } catch (\Exception $e) {
            \Log::error('Receipt consolidated download error', [
                'error' => $e->getMessage(),
                'branch' => $request->branch_name,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date
            ]);
            
            return response()->json([
                'message' => 'Error generating consolidated file',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get the file content for a receipt
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function getFileContent($id)
    {
        try {
            $receipt = Receipt::findOrFail($id);
            
            if (empty($receipt->file_content)) {
                return response()->json([
                    'message' => 'File content not found',
                ], 404);
            }

            return response($receipt->file_content)
                ->header('Content-Type', $receipt->mime_type ?? 'text/plain')
                ->header('Content-Disposition', 'inline; filename="' . ($receipt->file_name ?? 'receipt.txt') . '"');
                
        } catch (\Exception $e) {
            \Log::error('Error retrieving file content', [
                'receipt_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Error retrieving file content',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}