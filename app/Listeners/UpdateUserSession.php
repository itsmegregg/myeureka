<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class UpdateUserSession
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(Login $event): void
    {
        try {
            $user = $event->user;
            $sessionId = Session::getId();
            
            // Update or create the session record
            DB::table('user_sessions')->updateOrInsert(
                ['user_id' => $user->id],
                [
                    'session_id' => $sessionId,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'last_activity' => now(),
                    'updated_at' => now(),
                    'created_at' => DB::raw('IFNULL(created_at, NOW())')
                ]
            );
        } catch (\Exception $e) {
            // Just log the error and continue - don't break login functionality
            // We can continue without tracking the session if there's an error
        }
    }
}
