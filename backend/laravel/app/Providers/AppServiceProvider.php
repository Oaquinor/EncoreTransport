<?php

namespace App\Providers;

use App\Contracts\Maps\MapServiceInterface;
use App\Services\Maps\TomTomMapService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MapServiceInterface::class, function () {
            return match (config('maps.provider')) {
                'tomtom' => app(TomTomMapService::class),
                default => throw new \RuntimeException('Unsupported map provider: '.config('maps.provider')),
            };
        });
    }

    public function boot(): void
    {
        //
    }
}
