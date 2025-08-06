<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Run update commands after successful login
        try {
            // Log login user info
            \Log::info('User logged in, triggering update commands', [
                'user_id' => Auth::id(),
            ]);
            
            // Get yesterday's date
            $date = Carbon::yesterday()->format('Y-m-d');
            
            // Directly call the API controller method to run all commands
            $updateController = new \App\Http\Controllers\Api\UpdateCommandController();
            $updateRequest = new Request([
                'run_all' => true,
                'date' => $date
            ]);
            
            // Execute the command controller method directly
            $response = $updateController->runCommand($updateRequest);
            
            // Log the response
            \Log::info('Update commands execution result', [
                'success' => $response->original['success'],
                'message' => $response->original['message'],
            ]);
        } catch (\Exception $e) {
            // Log any errors but don't interrupt the login process
            \Log::error('Error running update commands after login', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
