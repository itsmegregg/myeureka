<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;

class SessionController extends Controller
{
    /**
     * Handle login and single-session enforcement
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();
            $user = Auth::user();
            $sessionId = Session::getId();

            try {
                // Get the current session ID
                $sessionId = Session::getId();
                
                // Log for debugging
                \Log::info('Login successful, invalidating other sessions', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'current_session' => $sessionId,
                    'ip' => $request->ip()
                ]);
                
                // First, record this session
                DB::table('user_sessions')->updateOrInsert(
                    ['user_id' => $user->id, 'session_id' => $sessionId],
                    [
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'last_activity' => now(),
                        'updated_at' => now(),
                        'created_at' => DB::raw('IFNULL(created_at, NOW())'),
                    ]
                );
                
                // Then invalidate all other sessions for this user
                DB::table('user_sessions')
                    ->where('user_id', $user->id)
                    ->where('session_id', '!=', $sessionId)
                    ->delete();
                
                // Verify the session was recorded
                $sessionRecorded = DB::table('user_sessions')
                    ->where('user_id', $user->id)
                    ->where('session_id', $sessionId)
                    ->exists();
                    
                \Log::info('Session recorded', [
                    'success' => $sessionRecorded,
                    'user_id' => $user->id,
                    'session_id' => $sessionId
                ]);
                
            } catch (\Exception $e) {
                // Log the error
                \Log::error('Failed to manage sessions', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // Continue even if we can't track sessions
                // Just log error if needed
            }

            return redirect()->intended(route('dashboard'));
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ]);
    }

    /**
     * Handle user logout
     */
    public function logout(Request $request)
    {
        try {
            // Remove session record when logging out
            DB::table('user_sessions')
                ->where('user_id', Auth::id())
                ->where('session_id', Session::getId())
                ->delete();
        } catch (\Exception $e) {
            // Continue even if we can't track sessions
        }

        Auth::logout();
        Session::invalidate();
        Session::regenerateToken();
        
        return redirect('/login');
    }

    /**
     * Check if current session is valid
     */
    public function check()
    {
        if (Auth::check()) {
            try {
                $user = Auth::user();
                $currentSessionId = Session::getId();
                
                \Log::info('Checking session validity', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'session_id' => $currentSessionId
                ]);

                $validSession = DB::table('user_sessions')
                    ->where('user_id', $user->id)
                    ->where('session_id', $currentSessionId)
                    ->exists();
                    
                \Log::info('Session check result', [
                    'valid' => $validSession,
                    'user_id' => $user->id,
                    'session_id' => $currentSessionId
                ]);

                if (!$validSession) {
                    \Log::warning('Invalid session detected - forcing logout', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'session_id' => $currentSessionId
                    ]);
                    
                    Auth::logout();
                    Session::flush();
                    return response()->json(['authenticated' => false, 'reason' => 'session_invalidated'], 401);
                }
                
                // Update last activity
                DB::table('user_sessions')
                    ->where('user_id', $user->id)
                    ->where('session_id', $currentSessionId)
                    ->update(['last_activity' => now()]);

                return response()->json(['authenticated' => true]);
            } catch (\Exception $e) {
                // Log the error
                \Log::error('Error checking session', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                // If we can't check session validity, assume it's valid
                return response()->json(['authenticated' => true, 'note' => 'error_but_continuing']);
            }
        }

        return response()->json(['authenticated' => false, 'reason' => 'not_logged_in'], 401);
    }
}
