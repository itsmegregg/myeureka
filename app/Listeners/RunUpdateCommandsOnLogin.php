<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class RunUpdateCommandsOnLogin implements ShouldQueue
{
    use InteractsWithQueue;
    
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
        // Get yesterday's date as default
        $date = Carbon::yesterday()->format('Y-m-d');
        
        // Run update commands for yesterday's data
        // We're using queue to avoid slowing down the login process
        // Artisan::queue('dsr:update', ['date' => $date]);
        Artisan::call('bir-detailed:update', ['date' => $date]);
        // Artisan::queue('summary:update', ['date' => $date]);
    }
}
