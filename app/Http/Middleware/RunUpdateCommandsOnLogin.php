<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class RunUpdateCommandsOnLogin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        
        // Check if this is a login request and it was successful
        if ($request->is('login') && Auth::check()) {
            // Get yesterday's date as default
            $date = Carbon::yesterday()->format('Y-m-d');
            
            // Run update commands for yesterday's data immediately
            try {
                // You can uncomment the other commands once this is working
                // Artisan::call('dsr:update', ['date' => $date]);
                Artisan::call('bir-detailed:update', ['date' => $date]);
                // Artisan::call('summary:update', ['date' => $date]);
                
                // Log that commands were run successfully (optional)
                \Log::info('Update commands executed after login', ['user' => Auth::id(), 'date' => $date]);
            } catch (\Exception $e) {
                // Log any errors (optional)
                \Log::error('Error running update commands after login', ['error' => $e->getMessage()]);
            }
        }
        
        return $response;
    }
}
