<?php

namespace App\Services\Routes;

use App\Models\RouteSegment;
use App\Models\TransportRoute;
use Illuminate\Validation\ValidationException;

class RouteSegmentService
{
    /** Resolve a requested pair to a persisted segment or the route's direct segment. */
    public function resolve(TransportRoute $route, ?string $origin, ?string $destination): array
    {
        $origin = trim((string) ($origin ?: $route->origin));
        $destination = trim((string) ($destination ?: $route->destination));
        $stops = $route->relationLoaded('stops') ? $route->stops : $route->stops()->get();
        $ordered = $stops->sortBy('sequence')->values();

        if ($ordered->isEmpty()) {
            if (strcasecmp($origin, $route->origin) !== 0 || strcasecmp($destination, $route->destination) !== 0) {
                throw ValidationException::withMessages(['segment' => 'This route does not expose the requested stops.']);
            }
            return ['origin' => $origin, 'destination' => $destination, 'origin_sequence' => 1, 'destination_sequence' => 2, 'price' => null, 'duration_seconds' => $route->duration_seconds];
        }

        $originStop = $ordered->first(fn ($stop) => strcasecmp($stop->name, $origin) === 0);
        $destinationStop = $ordered->first(fn ($stop) => strcasecmp($stop->name, $destination) === 0);

        if (!$originStop || !$destinationStop || $originStop->sequence >= $destinationStop->sequence) {
            throw ValidationException::withMessages(['segment' => 'Select two stops in travel order on this route.']);
        }

        $segments = $route->relationLoaded('segments') ? $route->segments : $route->segments()->get();
        $segment = $segments->first(fn (RouteSegment $candidate) => (int) $candidate->transport_route_id === (int) $route->id
            && (int) $candidate->origin_stop_sequence === (int) $originStop->sequence
            && (int) $candidate->destination_stop_sequence === (int) $destinationStop->sequence
            && $candidate->active
            && strcasecmp(trim($candidate->origin_name), trim($originStop->name)) === 0
            && strcasecmp(trim($candidate->destination_name), trim($destinationStop->name)) === 0);

        if (!$segment) {
            throw ValidationException::withMessages(['segment' => 'This direction is not configured for the selected route.']);
        }

        return [
            'origin' => $originStop->name,
            'destination' => $destinationStop->name,
            'origin_sequence' => (int) $originStop->sequence,
            'destination_sequence' => (int) $destinationStop->sequence,
            'price' => $segment?->price,
            'distance_meters' => $segment?->distance_meters,
            'duration_seconds' => $segment?->duration_seconds,
        ];
    }
}
