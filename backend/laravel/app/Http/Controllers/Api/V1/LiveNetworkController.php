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
            ->whereIn('status', ['scheduled', 'boarding', 'in_progress'])
            ->whereHas('latestLocation')
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

            return [
                'trip_id' => (string) $trip->id,
                'route_id' => (string) $trip->transport_route_id,
                'origin' => $trip->route?->origin,
                'destination' => $trip->route?->destination,
                'bus_code' => $trip->bus?->code,
                'latitude' => (float) $location->latitude,
                'longitude' => (float) $location->longitude,
                'heading' => $location->heading !== null ? (float) $location->heading : null,
                'last_location_at' => $location->recorded_at?->toIso8601String(),
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
