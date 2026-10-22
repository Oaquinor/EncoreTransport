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

        $segment = RouteSegment::query()
            ->where('transport_route_id', $route->id)
            ->where('origin_stop_sequence', $originStop->sequence)
            ->where('destination_stop_sequence', $destinationStop->sequence)
            ->where('active', true)
            ->first();

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
