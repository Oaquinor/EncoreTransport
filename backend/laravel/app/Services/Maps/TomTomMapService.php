<?php

namespace App\Services\Maps;

use App\Contracts\Maps\MapServiceInterface;
use App\Exceptions\MapProviderException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
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
        $response = $this->client()->get(
            rtrim((string) config('maps.tomtom.search_base_url'), '/').'/geocode/'.rawurlencode($address).'.json',
            array_filter([
                'key' => $this->apiKey(),
                'limit' => $options['limit'] ?? 5,
                'countrySet' => $options['country_set'] ?? config('maps.tomtom.country_set'),
                'language' => $options['language'] ?? config('maps.tomtom.language'),
            ], fn ($value) => $value !== null && $value !== '')
        );

        $this->assertSuccessful($response, 'geocoding');

        return $response->json();
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

        $url = rtrim((string) config('maps.tomtom.display_base_url'), '/')
            ."/maps/orbis/map-display/tile/{$zoom}/{$x}/{$y}.png";

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

        $contentType = strtolower((string) $response->header('Content-Type'));

        if ($contentType !== '' && !str_starts_with($contentType, 'image/')) {
            throw new MapProviderException(
                'map-display',
                502,
                'MAP_PROVIDER_INVALID_TILE_RESPONSE',
                'TomTom returned a non-image response for the map tile.'
            );
        }

        return [
            'body' => $response->body(),
            'content_type' => $response->header('Content-Type') ?: 'image/png',
            'cache_control' => $response->header('Cache-Control') ?: 'public, max-age=300',
            'etag' => $response->header('ETag'),
        ];
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
