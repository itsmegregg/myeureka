<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateActiveSession
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only check for authenticated users
        if (Auth::check()) {
            $user = Auth::user();
            $currentToken = session('user_session_token');
            
            // Check if the current session token matches the one in the database
            $storedToken = DB::table('users')
                ->where('id', $user->id)
                ->value('session_token');
                
            if (!$currentToken || $currentToken !== $storedToken) {
                // Session is no longer valid - another login has occurred
                Log::warning('Session invalidated for user', [
                    'user_id' => $user->id,
                    'reason' => 'Another device has logged in with this account'
                ]);
                
                Auth::logout();
                
                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Session expired. Please log in again.'], 401);
                }
                
                return redirect()->route('login')
                    ->with('status', 'This account has been logged in from another device. Please log in again.');
            }
            
            // Update the last_activity timestamp to keep the session active
            DB::table('users')
                ->where('id', $user->id)
                ->update(['last_activity' => now()]);
        }
        
        return $next($request);
    }
}
