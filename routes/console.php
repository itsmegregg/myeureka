<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('bir:aggregate-daily --from=yesterday --to=yesterday')
    ->dailyAt('02:00')
    ->onOneServer()
    ->withoutOverlapping();


Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(UpdateBirDetailedTable::class)->dailyAt('00:20');