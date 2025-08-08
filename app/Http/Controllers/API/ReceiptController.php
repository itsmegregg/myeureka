<?php

namespace App\Http\Controllers\API;

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
            
            // Ensure public/receipts directory exists
            $publicPath = public_path('receipts');
            if (!file_exists($publicPath)) {
                mkdir($publicPath, 0755, true);
            }

            // Move file to public/receipts to be directly web-accessible
            $file->move($publicPath, $filename);
            $path = 'receipts/' . $filename;
            
            \Log::info('File stored successfully', ['path' => $path]);

            // Parse filename components
            // Format: SI_NUMBER - DATE - BRANCH_NAME.TXT
            $filenameParts = pathinfo($filename, PATHINFO_FILENAME);
            $parts = explode(' - ', $filenameParts);
            
            $siNumber = $parts[0] ?? '';
            $date = $parts[1] ?? '';
            $branchName = $parts[2] ?? '';
            $type = $request->type ?? 'general';

            // Upsert receipt record by unique keys (si_number, date, branch_name, type)
            $attributes = [
                'si_number' => $siNumber,
                'date' => $date,
                'branch_name' => $branchName,
                'type' => $type,
            ];

            $values = [
                'file_path' => $path,
            ] + $attributes;

            $receipt = Receipt::updateOrCreate($attributes, $values);

            \Log::info('Receipt saved successfully', [
                'id' => $receipt->id,
                'created' => $receipt->wasRecentlyCreated,
            ]);

            return response()->json([
                'message' => $receipt->wasRecentlyCreated ? 'Receipt file created successfully!' : 'Receipt file updated successfully!',
                'action' => $receipt->wasRecentlyCreated ? 'created' : 'updated',
                'created' => (bool) $receipt->wasRecentlyCreated,
                'updated' => !$receipt->wasRecentlyCreated,
                'data' => $receipt,
                'file_url' => asset($path)
            ], $receipt->wasRecentlyCreated ? 201 : 200);
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
    
    public function show(Receipt $receipt)
    {
        return response()->json([
            'data' => $receipt
        ]);
    }


    
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

    /**
     * Search receipts by branch and date range (dates are strings in YYYYMMDD).
     */
    public function searchByDateRange(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'required|string|max:255',
            'from' => ['required','string','regex:/^\\d{8}$/'],
            'to' => ['required','string','regex:/^\\d{8}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $branch = $request->branch_name;
            $from = $request->from;
            $to = $request->to;

            // Ensure from <= to
            if ($from > $to) {
                [$from, $to] = [$to, $from];
            }

            $receipts = Receipt::where('branch_name', $branch)
                ->whereBetween('date', [$from, $to])
                ->orderBy('date', 'asc')
                ->orderBy('si_number', 'asc')
                ->get();

            return response()->json([
                'message' => 'Receipts fetched successfully',
                'data' => $receipts,
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Receipt date-range search error', [
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error searching receipts',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Download a consolidated TXT of all receipt files within a date range for a branch.
     * Dates are strings in YYYYMMDD.
     */
    public function downloadConsolidated(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'required|string|max:255',
            'from' => ['required','string','regex:/^\\d{8}$/'],
            'to' => ['required','string','regex:/^\\d{8}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $branch = $request->branch_name;
            $from = $request->from;
            $to = $request->to;
            if ($from > $to) { [$from, $to] = [$to, $from]; }

            $receipts = Receipt::where('branch_name', $branch)
                ->whereBetween('date', [$from, $to])
                ->orderBy('date', 'asc')
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
            foreach ($receipts as $r) {
                $fullPath = public_path($r->file_path);
                $header = $separator."\n".
                          "SI: {$r->si_number} | Branch: {$r->branch_name} | Date: {$r->date} | Type: ".($r->type ?? 'general')."\n".
                          $separator."\n";
                if (file_exists($fullPath)) {
                    $content = @file_get_contents($fullPath);
                    if ($content === false) { $content = "[ERROR] Unable to read file: {$r->file_path}\n"; }
                } else {
                    $content = "[MISSING] File not found: {$r->file_path}\n";
                }
                $lines[] = $header.$content."\n\n";
            }

            $combined = implode("", $lines);
            $filename = 'receipts-'.preg_replace('/[^A-Za-z0-9_-]+/', '_', $branch)."-{$from}-{$to}.txt";

            return response($combined, 200, [
                'Content-Type' => 'text/plain; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"'
            ]);
        } catch (\Exception $e) {
            \Log::error('Receipt consolidated download error', [ 'error' => $e->getMessage() ]);
            return response()->json([
                'message' => 'Error generating consolidated file',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
