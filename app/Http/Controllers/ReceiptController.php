<?php

namespace App\Http\Controllers;

use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;


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
    // 1. Validate the incoming request
    $validator = Validator::make($request->all(), [
        'file_name' => 'required|string|max:255',
        'file_content' => 'required|string',
        'branch_name' => 'nullable|string|max:255',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Validation Error',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        // 2. Process file content
        $fileContent = $request->file_content;
        // Remove any BOM (Byte Order Mark) if present
        $bom = pack('H*','EFBBBF');
        $fileContent = preg_replace("/^$bom/", '', $fileContent);
        
        // 3. Create a new Receipt record
        $receipt = Receipt::create([
            'file_name' => $request->file_name,
            'file_content' => $fileContent,
            'branch_name' => $request->branch_name,
        ]);

        // 4. Return success response
        return response()->json([
            'message' => 'Receipt saved successfully!',
            'data' => $receipt
        ], 201);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Error saving receipt',
            'error' => $e->getMessage()
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
