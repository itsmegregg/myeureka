<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class EnsureSingleSession
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            $currentSessionId = Session::getId();
            
            // Get the latest session for this user
            try {
                $latestSession = DB::table('user_sessions')
                    ->where('user_id', $user->id)
                    ->orderBy('last_activity', 'desc')
                    ->first();
                
                // If there's a session and it's not the current one, log out
                if ($latestSession && $latestSession->session_id !== $currentSessionId) {
                    // Another login has occurred, force logout this one
                    Auth::logout();
                    Session::flush();
                    
                    return redirect()->route('login')->with('error', 
                        'Your account was logged in from another device. For security reasons, you have been logged out.');
                }
            } catch (\Exception $e) {
                // If there's an error (like missing table), just continue without enforcing single session
                // Log the error if needed
                // \Log::error('Session check error: ' . $e->getMessage());
            }
            
            // Update or create the session record
            try {
                DB::table('user_sessions')->updateOrInsert(
                    ['user_id' => $user->id],
                    [
                        'session_id' => $currentSessionId,
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'last_activity' => now(),
                        'updated_at' => now(),
                        'created_at' => DB::raw('IFNULL(created_at, NOW())')
                    ]
                );
            } catch (\Exception $e) {
                // Log error if table doesn't exist or other DB issue
                // Just continue without enforcing single-session if there's a database error
            }
        }
        
        return $next($request);
    }
}