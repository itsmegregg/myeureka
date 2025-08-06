<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;

class SingleSessionController extends Controller
{
    /**
     * Handle login with single-session enforcement
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // First, check if user credentials are valid
        if (Auth::once($credentials)) {
            $user = Auth::getLastAttempted();
            
            try {
                // Check if user already has an active session
                $existingToken = DB::table('users')
                    ->where('id', $user->id)
                    ->value('session_token');
                    
                $lastActivity = DB::table('users')
                    ->where('id', $user->id)
                    ->value('last_activity');
                
                // Check if session exists and is still within the 4-hour window
                $sessionActive = false;
                $totalMinutes = null;
                
                if ($existingToken && $lastActivity) {
                    try {
                        $lastActivityTime = new \DateTime($lastActivity);
                        $currentTime = new \DateTime();
                        $timeDifference = $currentTime->diff($lastActivityTime);
                        
                        // Calculate total minutes of difference
                        $totalMinutes = ($timeDifference->days * 24 * 60) + 
                                       ($timeDifference->h * 60) + 
                                        $timeDifference->i;
                                        
                        // If last activity was within the last 4 hours (240 minutes), session is active
                        $sessionActive = $totalMinutes < 240;
                        
                        \Log::info("Session check", [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'last_activity' => $lastActivity,
                            'minutes_since_activity' => $totalMinutes,
                            'session_active' => $sessionActive
                        ]);
                        
                        // If session is expired, clear the token immediately
                        if (!$sessionActive) {
                            DB::table('users')
                                ->where('id', $user->id)
                                ->update([
                                    'session_token' => null,
                                    'last_activity' => null
                                ]);
                                
                            \Log::info("Cleared expired session", [
                                'user_id' => $user->id,
                                'email' => $user->email
                            ]);
                            
                            // Since we're clearing the token, reset these values
                            $existingToken = null;
                            $lastActivity = null;
                        }
                    } catch (\Exception $e) {
                        \Log::error("Error calculating session time: " . $e->getMessage());
                        // If there's an error calculating time difference, assume no active session
                        $sessionActive = false;
                    }
                }
                
                if ($sessionActive) {
                    // User already has an active session within 4 hours
                    return back()->withErrors([
                        'email' => 'This account is already logged in elsewhere. Please logout first or wait for the session to expire (4 hours of inactivity).',
                    ]);
                }
                
                // If we get here, either there's no session or it's expired
                // So proceed with the login
                
                // Generate a unique token for this user's current session
                $token = Str::random(60);
                
                // Store token and update last activity in user's data
                DB::table('users')
                    ->where('id', $user->id)
                    ->update([
                        'session_token' => $token, 
                        'last_activity' => now()
                    ]);
                
                // Login the user
                Auth::login($user, $request->boolean('remember'));
                    
                // Store in current session for validation
                session(['user_session_token' => $token]);
                
                // Regenerate session
                $request->session()->regenerate();
                
                return redirect()->intended(route('dashboard'));
                
            } catch (\Exception $e) {
                \Log::error("Session check error: " . $e->getMessage());
                // If there's an error checking the session, allow login
                Auth::login($user, $request->boolean('remember'));
                $request->session()->regenerate();
                return redirect()->intended(route('dashboard'));
            }
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ]);
    }

    /**
     * Handle logout
     */
    public function logout(Request $request)
    {
        // Get user before logout so we can clear their token
        $user = Auth::user();
        
        if ($user) {
            // Clear session token and last_activity in the database
            DB::table('users')
                ->where('id', $user->id)
                ->update([
                    'session_token' => null,
                    'last_activity' => null
                ]);
                
            \Log::info("User logged out, session cleared", [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
        }
        
        // Standard Laravel logout process
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return redirect('/login');
    }

    /**
     * Check if current session is valid and update last activity
     */
    public function check(Request $request)
    {
        if (!Auth::check()) {
            return response()->json(['authenticated' => false], 401);
        }

        try {
            $user = Auth::user();
            $currentToken = session('user_session_token');
            $storedToken = DB::table('users')
                ->where('id', $user->id)
                ->value('session_token');
            
            \Log::info("Session check", [
                'user_id' => $user->id,
                'current_token' => $currentToken,
                'stored_token' => $storedToken
            ]);

            if (!$currentToken || $currentToken !== $storedToken) {
                \Log::warning("Session invalidated - tokens don't match", [
                    'user_id' => $user->id,
                    'current_token' => $currentToken,
                    'stored_token' => $storedToken
                ]);
                
                Auth::logout();
                session()->invalidate();
                return response()->json(['authenticated' => false], 401);
            }
            
            // Update last activity timestamp on successful check
            DB::table('users')
                ->where('id', $user->id)
                ->update(['last_activity' => now()]);
            
            return response()->json(['authenticated' => true]);
        } catch (\Exception $e) {
            \Log::error("Error checking session: " . $e->getMessage());
            return response()->json(['authenticated' => true]); // Continue even if error
        }
    }
}
