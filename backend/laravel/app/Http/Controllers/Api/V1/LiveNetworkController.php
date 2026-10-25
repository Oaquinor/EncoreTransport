<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;

class LiveNetworkController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $trips = Trip::query()
            ->with(['route.stops', 'bus', 'latestLocation'])
            ->where('status', 'in_progress')
            ->orderBy('departure_date')
            ->orderBy('departure_time')
            ->get();

        $routes = $trips->pluck('route')->filter()->unique('id')->values()->map(function ($route) {
            return [
                'route_id' => (string) $route->id,
                'origin' => $route->origin,
                'destination' => $route->destination,
                'stops' => $route->stops->sortBy('sequence')->map(fn ($stop) => [
                    'name' => $stop->name,
                    'sequence' => (int) $stop->sequence,
                    'latitude' => $stop->latitude !== null ? (float) $stop->latitude : null,
                    'longitude' => $stop->longitude !== null ? (float) $stop->longitude : null,
                ])->values(),
            ];
        });

        $activeTrips = $trips->map(function (Trip $trip) {
            $location = $trip->latestLocation;
            $departure = $trip->departure_date?->toDateString().' '.$trip->departure_time;
            $recordedAt = $location?->recorded_at;
            $isStale = !$recordedAt || $recordedAt->lt(now()->subMinutes(5)) || $recordedAt->gt(now()->addMinute());

            return [
                'trip_id' => (string) $trip->id,
                'route_id' => (string) $trip->transport_route_id,
                'origin' => $trip->route?->origin,
                'destination' => $trip->route?->destination,
                'bus_code' => $trip->bus?->code,
                'latitude' => !$isStale && $location ? (float) $location->latitude : null,
                'longitude' => !$isStale && $location ? (float) $location->longitude : null,
                'heading' => !$isStale && $location?->heading !== null ? (float) $location->heading : null,
                'last_location_at' => $recordedAt?->toIso8601String(),
                'is_stale' => $isStale,
                'status' => $trip->status,
                'departure_time' => $departure,
                'estimated_arrival' => $trip->arrival_time,
            ];
        })->values();

        return response()->json([
            'data' => [
                'routes' => $routes,
                'trips' => $activeTrips,
                'updated_at' => now()->toIso8601String(),
            ],
        ])->header('Cache-Control', 'public, max-age=10, stale-while-revalidate=20');
    }
}
