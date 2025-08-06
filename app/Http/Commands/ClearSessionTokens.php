<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClearSessionTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:clear {--user= : Optional user ID to clear session for}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all session tokens and last activity timestamps';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->option('user');

        if ($userId) {
            DB::table('users')
                ->where('id', $userId)
                ->update([
                    'session_token' => null,
                    'last_activity' => null
                ]);
            
            $this->info("Session token cleared for user ID: {$userId}");
            Log::info("Session token cleared for user ID: {$userId}");
        } else {
            DB::table('users')
                ->update([
                    'session_token' => null,
                    'last_activity' => null
                ]);
            
            $this->info('All session tokens cleared successfully');
            Log::info('All session tokens cleared via command');
        }
    }
}
