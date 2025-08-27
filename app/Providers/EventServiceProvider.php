<?php

namespace App\Providers;

use Illuminate\Auth\Events\Login;
use App\Listeners\UpdateUserSession;
use App\Listeners\RunUpdateCommandsOnLogin;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Login::class => [
            UpdateUserSession::class,
            RunUpdateCommandsOnLogin::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }
}
