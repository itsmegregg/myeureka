<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class UpdateCommandController extends Controller
{
    /**
     * Run the specified update command
     */
    public function runCommand(Request $request)
    {
        try {
            $date = $request->input('date', Carbon::yesterday()->format('Y-m-d'));
            $results = [];
            $overallSuccess = true;
            
            // Commands to run in sequence
            $commands = [
                'dsr:update',
                'bir-detailed:update',
                'summary:update'    
            ];
            
            // Run each command in sequence
            foreach ($commands as $command) {
                \Log::info("Running {$command} command with date: {$date}");
                
                // Run the command
                $exitCode = Artisan::call($command, ['date' => $date]);
                
                // Get the output
                $output = Artisan::output();
                
                \Log::info("{$command} command executed with exit code: {$exitCode}");
                \Log::info("Command output: {$output}");
                
                $results[$command] = [
                    'exitCode' => $exitCode,
                    'output' => $output,
                    'success' => ($exitCode === 0)
                ];
                
                // If any command fails, mark overall as failed but continue processing
                if ($exitCode !== 0) {
                    $overallSuccess = false;
                }
            }
            
            return response()->json([
                'success' => $overallSuccess,
                'message' => $overallSuccess ? 'All commands executed successfully' : 'One or more commands had errors',
                'data' => [
                    'date' => $date,
                    'results' => $results
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error executing command: ' . $e->getMessage()
            ], 500);
        }
    }
}
