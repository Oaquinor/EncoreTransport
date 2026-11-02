<?php

namespace App\Services\Maps;

use App\Contracts\Maps\MapServiceInterface;
use App\Exceptions\MapProviderException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class TomTomMapService implements MapServiceInterface
{
    public function search(string $query, array $options = []): array
    {
        $response = $this->client()->get(
            rtrim((string) config('maps.tomtom.search_base_url'), '/').'/search/'.rawurlencode($query).'.json',
            array_filter([
                'key' => $this->apiKey(),
                'limit' => $options['limit'] ?? 10,
                'countrySet' => $options['country_set'] ?? config('maps.tomtom.country_set'),
                'language' => $options['language'] ?? config('maps.tomtom.language'),
                'lat' => $options['lat'] ?? null,
                'lon' => $options['lon'] ?? null,
            ], fn ($value) => $value !== null && $value !== '')
        );

        $this->assertSuccessful($response, 'search');

        return $response->json();
    }

    public function geocode(string $address, array $options = []): array
    {
        $countrySet = array_key_exists('country_set', $options)
            ? $options['country_set']
            : config('maps.tomtom.country_set');

        $payload = $this->performGeocode(
            $address,
            $options,
            $countrySet
        );

        $allowGlobalFallback = $options['allow_global_fallback'] ?? true;

        if (
            $allowGlobalFallback &&
            !empty($countrySet) &&
            empty($payload['results'])
        ) {
            $payload = $this->performGeocode(
                $address,
                $options,
                null
            );
        }

        return $payload;
    }

    public function reverseGeocode(float $latitude, float $longitude, array $options = []): array
    {
        $response = $this->client()->get(
            rtrim((string) config('maps.tomtom.search_base_url'), '/').'/reverseGeocode/'.$latitude.','.$longitude.'.json',
            [
                'key' => $this->apiKey(),
                'language' => $options['language'] ?? config('maps.tomtom.language'),
                'returnSpeedLimit' => 'false',
            ]
        );

        $this->assertSuccessful($response, 'reverse-geocoding');

        return $response->json();
    }

    public function calculateRoute(
        float $originLatitude,
        float $originLongitude,
        float $destinationLatitude,
        float $destinationLongitude,
        array $options = []
    ): array {
        $locations = $originLatitude.','.$originLongitude.':'.$destinationLatitude.','.$destinationLongitude;

        $response = $this->client()->get(
            rtrim((string) config('maps.tomtom.routing_base_url'), '/').'/calculateRoute/'.$locations.'/json',
            [
                'key' => $this->apiKey(),
                'routeType' => $options['route_type'] ?? 'fastest',
                'traffic' => ($options['traffic'] ?? true) ? 'true' : 'false',
                'travelMode' => $options['travel_mode'] ?? config('maps.tomtom.travel_mode', 'car'),
                'instructionsType' => 'text',
                'language' => $options['language'] ?? config('maps.tomtom.language'),
            ]
        );

        $this->assertSuccessful($response, 'routing');

        return $response->json();
    }

    public function rasterTile(int $zoom, int $x, int $y, array $options = []): array
    {
        if ($zoom < 0 || $zoom > 22) {
            throw new RuntimeException('Invalid map zoom level.');
        }

        $maximumTile = (2 ** $zoom) - 1;

        if ($x < 0 || $y < 0 || $x > $maximumTile || $y > $maximumTile) {
            throw new RuntimeException('Invalid map tile coordinates.');
        }

        $style = (string) ($options['style'] ?? config('maps.tomtom.style', 'street-light'));

        if (!in_array($style, ['street-light', 'street-dark'], true)) {
            $style = 'street-light';
        }

        $tileSize = (int) ($options['tile_size'] ?? config('maps.tomtom.tile_size', 256));

        if (!in_array($tileSize, [256, 512], true)) {
            $tileSize = 256;
        }

        $cacheKey = $this->tileCacheKey($zoom, $x, $y, $style, $tileSize);
        if ($this->tileCacheEnabled()) {
            $cached = $this->tileCache()->get($cacheKey);
            if (is_array($cached) && isset($cached['body'], $cached['content_type'], $cached['cache_control'])) {
                return array_merge($cached, [
                    'cache_status' => 'HIT',
                    'upstream_ms' => 0,
                ]);
            }
        }

        $url = rtrim((string) config('maps.tomtom.display_base_url'), '/')
            ."/maps/orbis/map-display/tile/{$zoom}/{$x}/{$y}.png";

        $startedAt = hrtime(true);
        $response = Http::withHeaders([
                'Accept' => 'image/png,*/*;q=0.8',
                'TomTom-Api-Version' => '1',
            ])
            ->timeout((int) config('maps.tomtom.timeout', 15))
            ->retry(2, 250, throw: false)
            ->get($url, [
                'apiVersion' => 1,
                'key' => $this->apiKey(),
                'style' => $style,
                'tileSize' => $tileSize,
                'language' => config('maps.tomtom.language', 'es-ES'),
                'view' => config('maps.tomtom.view', 'Unified'),
            ]);

        $this->assertSuccessful($response, 'map-display');

        $upstreamMs = round((hrtime(true) - $startedAt) / 1_000_000, 2);

        $contentType = strtolower((string) $response->header('Content-Type'));

        if ($contentType !== '' && !str_starts_with($contentType, 'image/')) {
            throw new MapProviderException(
                'map-display',
                502,
                'MAP_PROVIDER_INVALID_TILE_RESPONSE',
                'TomTom returned a non-image response for the map tile.'
            );
        }

        $cacheControl = $response->header('Cache-Control') ?: 'public, max-age='.config('maps.tomtom.cache_default_ttl', 300);
        $tile = [
            'body' => $response->body(),
            'content_type' => $response->header('Content-Type') ?: 'image/png',
            'cache_control' => $cacheControl,
            'etag' => $response->header('ETag'),
            'cache_status' => 'MISS',
            'upstream_ms' => $upstreamMs,
        ];

        $ttl = $this->cacheTtl($cacheControl);
        if ($this->tileCacheEnabled() && $ttl > 0) {
            $this->tileCache()->put($cacheKey, $tile, $ttl);
        }

        return $tile;
    }

    private function tileCacheEnabled(): bool
    {
        return (bool) config('maps.tomtom.cache_enabled', true);
    }

    private function tileCache()
    {
        $store = trim((string) config('maps.tomtom.cache_store', ''));

        return $store !== '' ? Cache::store($store) : Cache::driver();
    }

    private function tileCacheKey(int $zoom, int $x, int $y, string $style, int $tileSize): string
    {
        return 'maps:tomtom:tile:'.hash('sha256', implode('|', [
            $zoom,
            $x,
            $y,
            $style,
            $tileSize,
            config('maps.tomtom.language', 'en-GB'),
            config('maps.tomtom.view', 'Unified'),
        ]));
    }

    private function cacheTtl(string $cacheControl): int
    {
        $directives = strtolower($cacheControl);
        if (str_contains($directives, 'no-store') || str_contains($directives, 'private')) {
            return 0;
        }

        $default = max(0, (int) config('maps.tomtom.cache_default_ttl', 300));
        $maximum = max(0, (int) config('maps.tomtom.cache_max_ttl', 3600));
        $ttl = $default;
        if (preg_match('/(?:^|,)\s*max-age\s*=\s*(\d+)/i', $cacheControl, $matches)) {
            $ttl = (int) $matches[1];
        }

        return $maximum > 0 ? min($ttl, $maximum) : 0;
    }

    private function performGeocode(
        string $address,
        array $options,
        ?string $countrySet
    ): array {
        $response = $this->client()->get(
            rtrim((string) config('maps.tomtom.search_base_url'), '/').'/geocode/'.rawurlencode($address).'.json',
            array_filter([
                'key' => $this->apiKey(),
                'limit' => $options['limit'] ?? 5,
                'countrySet' => $countrySet,
                'language' => $options['language'] ?? config('maps.tomtom.language'),
            ], fn ($value) => $value !== null && $value !== '')
        );

        $this->assertSuccessful($response, 'geocoding');

        return $response->json();
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->timeout((int) config('maps.tomtom.timeout', 15))
            ->retry(2, 250, throw: false);
    }

    private function apiKey(): string
    {
        $key = trim((string) config('maps.tomtom.api_key'));

        if ($key === '') {
            throw new RuntimeException('TOMTOM_API_KEY is not configured in the Laravel runtime.');
        }

        return $key;
    }

    private function assertSuccessful(Response $response, string $service): void
    {
        if ($response->successful()) {
            return;
        }

        $status = $response->status();

        [$code, $message] = match ($status) {
            401, 403 => [
                'MAP_PROVIDER_AUTHORIZATION_FAILED',
                "TomTom rejected the configured credentials for {$service}. Verify that the API key is valid and enabled for this TomTom service.",
            ],
            429 => [
                'MAP_PROVIDER_RATE_LIMITED',
                "TomTom rate-limited the {$service} request. Wait and retry or review the key quota.",
            ],
            400 => [
                'MAP_PROVIDER_BAD_REQUEST',
                "TomTom rejected the {$service} request parameters.",
            ],
            default => $status >= 500
                ? [
                    'MAP_PROVIDER_UNAVAILABLE',
                    "TomTom {$service} is temporarily unavailable.",
                ]
                : [
                    'MAP_PROVIDER_REQUEST_FAILED',
                    "TomTom rejected the {$service} request.",
                ],
        };

        throw new MapProviderException(
            $service,
            $status,
            $code,
            $message
        );
    }
}
