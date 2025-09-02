<?php

namespace App\Http\Controllers\API;

use App\Models\Zread;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ZreadController extends Controller
{
    /**
     * Store a newly created Z-read record and uploaded file.
     * Expected filename format: DATE - BRANCH_NAME.txt (e.g., 20250818 - MainBranch.txt)
     */
    public function store(Request $request)
    {
        try {
            \Log::info('Zread upload attempt', [
                'has_file' => $request->hasFile('file'),
                'file_name' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'none',
                'branch_name' => $request->branch_name,
            ]);

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
                \Log::warning('Zread validation failed', ['errors' => $validator->errors()]);
                return response()->json([
                    'message' => 'Validation Error',
                    'errors' => $validator->errors()
                ], 422);
            }

            if ($request->hasFile('file')) {
                $file = $request->file('file');

                \Log::info('Processing Zread file upload', [
                    'original_name' => $file->getClientOriginalName(),
                    'extension' => $file->getClientOriginalExtension(),
                    'size' => $file->getSize()
                ]);

                // Use original filename
                $filename = $file->getClientOriginalName();

                // Parse filename components
                // Expected Format: DATE - BRANCH_NAME.TXT (DATE as string e.g., YYYYMMDD)
                $filenameParts = pathinfo($filename, PATHINFO_FILENAME);
                $parts = explode(' - ', $filenameParts);

                $dateRaw = trim($parts[0] ?? '');
                $branchName = trim($parts[1] ?? ($request->branch_name ?? ''));

                // Normalize date to Y-m-d for DATE column
                $date = '';
                if (preg_match('/^\\d{8}$/', $dateRaw)) {
                    // YYYYMMDD -> YYYY-MM-DD
                    $date = substr($dateRaw, 0, 4) . '-' . substr($dateRaw, 4, 2) . '-' . substr($dateRaw, 6, 2);
                } elseif (preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $dateRaw)) {
                    $date = $dateRaw;
                }

                if (empty($date) || empty($branchName)) {
                    \Log::warning('Zread derived values missing', [ 'dateRaw' => $dateRaw, 'date' => $date, 'branch' => $branchName ]);
                    return response()->json([
                        'message' => 'Invalid filename or parameters. Expected "DATE - BRANCH_NAME.txt" or provide branch_name.',
                        'errors' => [
                            'file' => ['Unable to derive date/branch_name from filename.'],
                        ]
                    ], 422);
                }

                // Read file content
                $fileContent = file_get_contents($file->getRealPath());

                // Upsert zread record by unique keys (date, branch_name)
                $attributes = [
                    'date' => $date,
                    'branch_name' => $branchName,
                ];

                $values = [
                    'file_name' => $filename,
                    'file_content' => $fileContent,
                    'mime_type' => $file->getMimeType(),
                ];

                // No file system operations needed - we store everything in the database

                $zread = Zread::updateOrCreate($attributes, $values);

                \Log::info('Zread saved successfully', [
                    'id' => $zread->id,
                    'created' => $zread->wasRecentlyCreated,
                ]);

                // Build response payload
                $dateOut = str_replace('-', '', $date); // ensure YYYYMMDD
                $base64 = base64_encode($fileContent);

                return response()->json([
                    'date' => $dateOut,
                    'branch_name' => $branchName,
                    'file' => $base64,
                    'filename' => $filename,
                ], 200);
            }
        } catch (\Exception $e) {
            \Log::error('Zread upload error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error uploading zread file',
                'error' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : 'Please check logs'
            ], 500);
        }
    }
}
