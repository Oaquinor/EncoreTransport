<?php

use App\Contracts\Maps\MapServiceInterface;
use App\Jobs\ReleaseExpiredBookings;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::job(new ReleaseExpiredBookings)
    ->everyMinute()
    ->withoutOverlapping();

Artisan::command('encore:maps:diagnose', function () {
    $this->info('EncoreTransport map diagnostics');
    $this->line('');

    $provider = (string) config('maps.provider');
    $keyConfigured = trim((string) config('maps.tomtom.api_key')) !== '';

    $this->line('Provider: '.$provider);
    $this->line('API key loaded by Laravel: '.($keyConfigured ? 'YES' : 'NO'));
    $this->line('Search host: '.parse_url((string) config('maps.tomtom.search_base_url'), PHP_URL_HOST));
    $this->line('Routing host: '.parse_url((string) config('maps.tomtom.routing_base_url'), PHP_URL_HOST));
    $this->line('Display host: '.parse_url((string) config('maps.tomtom.display_base_url'), PHP_URL_HOST));
    $this->line('Language: '.config('maps.tomtom.language'));
    $this->line('Country set: '.config('maps.tomtom.country_set'));
    $this->line('');

    if ($provider !== 'tomtom') {
        $this->error('FAIL provider: unsupported map provider configured.');
        return self::FAILURE;
    }

    if (!$keyConfigured) {
        $this->error('FAIL configuration: TOMTOM_API_KEY is not loaded by Laravel.');
        $this->warn('If you just changed .env, run: php artisan optimize:clear');
        return self::FAILURE;
    }

    /** @var MapServiceInterface $maps */
    $maps = app(MapServiceInterface::class);

    $failed = false;

    try {
        $geocode = $maps->geocode('Santo Domingo, Dominican Republic', ['limit' => 1]);
        $position = $geocode['results'][0]['position'] ?? null;

        if (!$position || !isset($position['lat'], $position['lon'])) {
            throw new RuntimeException('Geocoding returned no usable coordinate.');
        }

        $this->info('PASS geocoding');
    } catch (\Throwable $e) {
        $failed = true;
        $this->error('FAIL geocoding: '.$e->getMessage());
    }

    try {
        $route = $maps->calculateRoute(
            18.4861,
            -69.9312,
            19.4517,
            -70.6970
        );

        if (empty($route['routes'])) {
            throw new RuntimeException('Routing returned no route.');
        }

        $this->info('PASS routing');
    } catch (\Throwable $e) {
        $failed = true;
        $this->error('FAIL routing: '.$e->getMessage());
    }

    try {
        $tile = $maps->rasterTile(0, 0, 0);

        if (!str_starts_with(strtolower((string) ($tile['content_type'] ?? '')), 'image/')) {
            throw new RuntimeException('Map Display returned a non-image response.');
        }

        $this->info('PASS map-display raster tile');
    } catch (\Throwable $e) {
        $failed = true;
        $this->error('FAIL map-display: '.$e->getMessage());
    }

    $this->line('');

    if ($failed) {
        $this->warn('At least one TomTom service failed. The API key may exist but lack permission for one product, the provider may be unreachable, or the Laravel runtime may still have stale configuration.');
        return self::FAILURE;
    }

    $this->info('All configured TomTom map services responded successfully.');
    return self::SUCCESS;
})->purpose('Checks Laravel map configuration, TomTom geocoding, routing, and raster tiles without printing the API key.');
