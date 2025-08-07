<?php

namespace App\Http\Controllers\api;

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
    /**
     * Clean receipt content by removing extra spaces and normalizing line endings
     */
    private function cleanReceiptContent($content)
    {
        if (empty($content)) {
            return $content;
        }
        
        // Normalize line endings
        $content = str_replace("\r\n", "\n", $content);
        
        // Remove multiple spaces
        $content = preg_replace('/\s+/', ' ', $content);
        
        // Remove spaces at the beginning and end of lines
        $lines = explode("\n", $content);
        $cleanedLines = [];
        
        foreach ($lines as $line) {
            $cleanedLines[] = trim($line);
        }
        
        return implode("\n", $cleanedLines);
    }
    
    public function store(Request $request)
{
    try {
        // Log request for debugging
        \Log::info('Receipt upload attempt', [
            'has_file' => $request->hasFile('file'),
            'file_name' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'none',
            'branch_name' => $request->branch_name
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
     * Download receipt as .txt file
     */
    public function downloadTxt(Receipt $receipt)
    {
        $filename = $receipt->file_name;
        $content = $receipt->file_content;
        
        return response($content, 200, [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Download receipt as .pdf file
     */
    public function downloadPdf(Receipt $receipt)
    {
        // For PDF generation, you can use DomPDF or similar
        // This is a basic text-to-PDF conversion
        $content = $receipt->file_content;
        $filename = str_replace('.txt', '.pdf', $receipt->file_name);
        
        // Simple text to PDF conversion (basic)
        $pdfContent = $this->convertTextToPdf($content);
        
        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Convert text content to basic PDF format
     */
    private function convertTextToPdf($text)
    {
        // This is a basic PDF format - for production, use DomPDF or similar
        $pdf = "%PDF-1.4\n";
        $pdf .= "1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n";
        $pdf .= "2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n";
        
        // Create content stream
        $content = "BT\n/F1 12 Tf\n72 720 Td\n(" . str_replace("\n", ") Tj\nT*\n(", $text) . ") Tj\nET";
        $contentLength = strlen($content);
        
        $pdf .= "3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n>>\nendobj\n";
        
        $pdf .= "4 0 obj\n<<\n/Length " . $contentLength . "\n>>\nstream\n" . $content . "\nendstream\nendobj\n";
        
        $pdf .= "xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000059 00000 n \n0000000118 00000 n \n0000000264 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n398\n%%EOF";
        
        return $pdf;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Receipt $receipt)
    {
        $validator = Validator::make($request->all(), [
            'file_name' => 'sometimes|string|max:255',
            'file_content' => 'sometimes|string',
            'branch_name' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $receipt->update($request->all());
            
            return response()->json([
                'message' => 'Receipt updated successfully!',
                'data' => $receipt
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error updating receipt',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Receipt $receipt)
    {
        //
    }
}
