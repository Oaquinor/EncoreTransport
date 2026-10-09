<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Maps\MapServiceInterface;
use App\Exceptions\MapProviderException;
use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;
use Throwable;

class MapController extends Controller
{
    public function __construct(private readonly MapServiceInterface $maps) {}

    public function search(Request $request)
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'max:250'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        return $this->call(fn () => [
            'raw' => $this->maps->search($data['q'], ['limit' => $data['limit'] ?? 10]),
        ]);
    }

    public function geocode(Request $request)
    {
        $data = $request->validate([
            'address' => ['required', 'string', 'max:300'],
        ]);

        return $this->call(
            fn () => $this->normalizeGeocode($this->maps->geocode($data['address']))
        );
    }

    public function reverseGeocode(Request $request)
    {
        $data = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        return $this->call(fn () => [
            'raw' => $this->maps->reverseGeocode(
                (float) $data['latitude'],
                (float) $data['longitude']
            ),
        ]);
    }

    public function route(Request $request)
    {
        $data = $request->validate([
            'origin_latitude' => ['required', 'numeric', 'between:-90,90'],
            'origin_longitude' => ['required', 'numeric', 'between:-180,180'],
            'destination_latitude' => ['required', 'numeric', 'between:-90,90'],
            'destination_longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        return $this->call(fn () => $this->normalizeRoute(
            $this->maps->calculateRoute(
                (float) $data['origin_latitude'],
                (float) $data['origin_longitude'],
                (float) $data['destination_latitude'],
                (float) $data['destination_longitude']
            )
        ));
    }

    #[OA\Get(
        path: '/api/v1/maps/journey',
        operationId: 'mapJourney',
        summary: 'Resolve origin/destination and calculate a TomTom route',
        tags: ['Maps'],
        parameters: [
            new OA\Parameter(name: 'origin', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'destination', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Normalized route'),
            new OA\Response(response: 422, description: 'Location could not be resolved'),
            new OA\Response(response: 502, description: 'TomTom rejected the upstream request'),
            new OA\Response(response: 503, description: 'TomTom is not configured, rate-limited, or unavailable'),
        ]
    )]
    public function journey(Request $request)
    {
        $data = $request->validate([
            'origin' => ['required', 'string', 'max:250'],
            'destination' => ['required', 'string', 'max:250'],
        ]);

        return $this->call(function () use ($data) {
            $origin = $this->normalizeGeocode($this->maps->geocode($data['origin']));
            $destination = $this->normalizeGeocode($this->maps->geocode($data['destination']));

            if (!$origin || !$destination) {
                throw new RuntimeException('Unable to resolve origin or destination.');
            }

            $route = $this->normalizeRoute(
                $this->maps->calculateRoute(
                    $origin['latitude'],
                    $origin['longitude'],
                    $destination['latitude'],
                    $destination['longitude']
                )
            );

            return [
                'origin' => $origin,
                'destination' => $destination,
                'route' => $route,
            ];
        }, 422);
    }

    /**
     * Real TomTom raster tile proxy.
     *
     * The browser receives map imagery without receiving TOMTOM_API_KEY.
     */
    public function tile(Request $request, int $z, int $x, int $y)
    {
        try {
            $tile = $this->maps->rasterTile($z, $x, $y, [
                'style' => $request->query('style', 'street-light'),
                'tile_size' => (int) $request->query('tileSize', 256),
            ]);

            $headers = [
                'Content-Type' => $tile['content_type'],
                'Cache-Control' => $tile['cache_control'],
                'X-Content-Type-Options' => 'nosniff',
            ];

            if (!empty($tile['etag'])) {
                $headers['ETag'] = $tile['etag'];
            }

            return response($tile['body'], 200, $headers);
        } catch (MapProviderException $e) {
            return $this->providerError($e);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'MAP_CONFIGURATION_ERROR',
            ], 503);
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'Unable to connect to TomTom from the Laravel server.',
                'code' => 'MAP_PROVIDER_CONNECTION_FAILED',
            ], 503);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to load the map tile.',
                'code' => 'MAP_TILE_ERROR',
            ], 502);
        }
    }

    private function normalizeGeocode(array $payload): ?array
    {
        $item = $payload['results'][0] ?? null;

        if (!$item || !isset($item['position']['lat'], $item['position']['lon'])) {
            return null;
        }

        return [
            'name' => $item['address']['freeformAddress'] ?? $item['poi']['name'] ?? null,
            'latitude' => (float) $item['position']['lat'],
            'longitude' => (float) $item['position']['lon'],
        ];
    }

    private function normalizeRoute(array $payload): array
    {
        $route = $payload['routes'][0] ?? [];
        $summary = $route['summary'] ?? [];
        $points = [];

        foreach (($route['legs'] ?? []) as $leg) {
            foreach (($leg['points'] ?? []) as $point) {
                if (isset($point['latitude'], $point['longitude'])) {
                    $points[] = [
                        'latitude' => (float) $point['latitude'],
                        'longitude' => (float) $point['longitude'],
                    ];
                }
            }
        }

        return [
            'distanceMeters' => (int) ($summary['lengthInMeters'] ?? 0),
            'durationSeconds' => (int) ($summary['travelTimeInSeconds'] ?? 0),
            'trafficDelaySeconds' => (int) ($summary['trafficDelayInSeconds'] ?? 0),
            'points' => $points,
        ];
    }

    private function call(callable $callback, int $runtimeStatus = 503)
    {
        try {
            return response()->json(['data' => $callback()]);
        } catch (MapProviderException $e) {
            return $this->providerError($e);
        } catch (RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'Unable to resolve')
                ? $runtimeStatus
                : 503;

            return response()->json([
                'message' => $e->getMessage(),
                'code' => $status === 422
                    ? 'MAP_LOCATION_NOT_RESOLVED'
                    : 'MAP_CONFIGURATION_ERROR',
            ], $status);
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'Unable to connect to TomTom from the Laravel server.',
                'code' => 'MAP_PROVIDER_CONNECTION_FAILED',
            ], 503);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to complete the map request.',
                'code' => 'MAP_REQUEST_ERROR',
            ], 502);
        }
    }

    private function providerError(MapProviderException $e)
    {
        return response()->json([
            'message' => $e->getMessage(),
            'code' => $e->publicCode(),
            'service' => $e->service(),
        ], $e->clientStatus());
    }
}
