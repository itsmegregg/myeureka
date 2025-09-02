<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class CacheController extends Controller
{
    public function clearAllCaches()
    {
        Artisan::call('optimize:clear');

        if (function_exists('opcache_reset')) {
            opcache_reset();
            return response('OPcache and application cache cleared.');
        }

        return response('Application cache cleared, but OPcache reset function is not available.');
    }
}
