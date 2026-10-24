<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Trip;
use App\Models\TransportRoute;
use App\Services\Bookings\SeatAvailabilityService;
use App\Services\Routes\RouteSegmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

class TripController extends Controller
{
    #[OA\Get(path:'/api/v1/trips/search',operationId:'searchTrips',summary:'Buscar viajes disponibles',tags:['Trips'],responses:[new OA\Response(response:200,description:'Viajes')])]
    public function search(Request $request, RouteSegmentService $segments, SeatAvailabilityService $availability)
    {
        $filters = $request->validate([
            'origin' => ['nullable', 'string', 'max:150'],
            'destination' => ['nullable', 'string', 'max:150'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'passengers' => ['nullable', 'integer', 'min:1', 'max:10'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $passengers = (int) ($filters['passengers'] ?? 1);
        $routeIds = $this->matchingActiveRouteIds($filters['origin'] ?? null, $filters['destination'] ?? null);
        if ($routeIds->isEmpty()) return TripResource::collection(Trip::query()->whereRaw('1 = 0')->paginate((int) ($filters['per_page'] ?? 20)));

        $routeRecords = TransportRoute::query()->whereIn('id', $routeIds)
            ->with(['stops', 'segments'])->get()->keyBy('id');
        $routeSegments = [];
        foreach ($routeRecords as $routeId => $route) {
            try {
                $routeSegments[$routeId] = $segments->resolve($route, $filters['origin'] ?? null, $filters['destination'] ?? null);
            } catch (ValidationException) {
                // The SQL route filter and resolver must agree; invalid route metadata is excluded below.
            }
        }

        $tripQuery = Trip::query()
            ->with(['route.stops', 'route.segments', 'bus', 'driver'])
            ->whereIn('transport_route_id', array_keys($routeSegments))
            ->whereIn('status', ['scheduled', 'boarding'])
            ->whereDate('departure_date', '>=', today())
            ->when($filters['date'] ?? null, fn ($query, $date) => $query->whereDate('departure_date', $date));

        // Filter bookable capacity in SQL before pagination. The interval uses the
        // selected route segment, so each route branch has its own sequence pair.
        $tripQuery->where(function ($routesQuery) use ($routeSegments, $passengers) {
            foreach ($routeSegments as $routeId => $segment) {
                $routesQuery->orWhere(function ($routeQuery) use ($routeId, $segment, $passengers) {
                    $routeQuery->where('transport_route_id', $routeId)->whereRaw(
                        '(SELECT COUNT(*) FROM bus_seats capacity WHERE capacity.bus_id = trips.bus_id AND capacity.active = 1 AND capacity.blocked = 0) - '
                        .'(SELECT COUNT(DISTINCT reserved.bus_seat_id) FROM booking_seats reserved '
                        .'JOIN bus_seats seat ON seat.id = reserved.bus_seat_id '
                        .'WHERE reserved.trip_id = trips.id AND seat.bus_id = trips.bus_id AND seat.active = 1 AND seat.blocked = 0 '
                        .'AND reserved.origin_stop_sequence < ? AND reserved.destination_stop_sequence > ? '
                        .'AND (reserved.status = ? OR (reserved.status = ? AND (reserved.held_until IS NULL OR reserved.held_until > ?)))) >= ?',
                        [$segment['destination_sequence'], $segment['origin_sequence'], 'confirmed', 'held', now(), $passengers],
                    );
                });
            }
        });

        $trips = $tripQuery->orderBy('departure_date')->orderBy('departure_time')
            ->paginate((int) ($filters['per_page'] ?? 20));
        $segmentsByTripId = collect($trips->items())->mapWithKeys(fn (Trip $trip) => [$trip->id => $routeSegments[$trip->transport_route_id]])->all();
        $availableCounts = $availability->availableCountsForTrips($trips->items(), $segmentsByTripId);

        foreach ($trips->items() as $trip) {
            $trip->setAttribute('_requested_segment', $routeSegments[$trip->transport_route_id]);
            $trip->setAttribute('_requested_available_seats', $availableCounts[$trip->id]);
        }

        return TripResource::collection($trips);
    }

    public function show(Trip $trip, RouteSegmentService $segments, SeatAvailabilityService $availability)
    {
        $trip->load(['route.stops', 'route.segments', 'bus', 'driver']);
        $requestedSegment = null;
        $availableSeats = 0;
        if (in_array($trip->status, ['scheduled', 'boarding'], true)) {
            try {
                $requestedSegment = $segments->resolve($trip->route, $trip->route?->origin, $trip->route?->destination);
                $availableSeats = $availability->availableCount($trip, $requestedSegment);
            } catch (ValidationException) {
                $availableSeats = 0;
            }
        }
        $trip->setAttribute('_requested_segment', $requestedSegment);
        $trip->setAttribute('_requested_available_seats', $availableSeats);

        return new TripResource($trip);
    }

    private function matchingActiveRouteIds(?string $origin, ?string $destination)
    {
        $stoppedRoutes = DB::table('transport_routes as route')
            ->where('route.active', true)
            ->whereExists(function ($query) use ($origin, $destination) {
                $query->selectRaw('1')->from('route_stops as origin_stop')
                    ->join('route_stops as destination_stop', function ($join) {
                        $join->on('destination_stop.transport_route_id', '=', 'origin_stop.transport_route_id')
                            ->whereColumn('origin_stop.sequence', '<', 'destination_stop.sequence');
                    })
                    ->join('route_segments as segment', function ($join) {
                        $join->on('segment.transport_route_id', '=', 'origin_stop.transport_route_id')
                            ->on('segment.origin_stop_sequence', '=', 'origin_stop.sequence')
                            ->on('segment.destination_stop_sequence', '=', 'destination_stop.sequence')
                            ->where('segment.active', true);
                    })
                    ->whereColumn('origin_stop.transport_route_id', 'route.id')
                    ->whereColumn('origin_stop.name', 'segment.origin_name')
                    ->whereColumn('destination_stop.name', 'segment.destination_name')
                    ->when($origin, fn ($q) => $q->whereRaw('LOWER(TRIM(origin_stop.name)) = LOWER(?)', [trim($origin)]),
                        fn ($q) => $q->whereColumn('origin_stop.name', 'route.origin'))
                    ->when($destination, fn ($q) => $q->whereRaw('LOWER(TRIM(destination_stop.name)) = LOWER(?)', [trim($destination)]),
                        fn ($q) => $q->whereColumn('destination_stop.name', 'route.destination'));
            })
            ->pluck('route.id');

        $legacyRoutes = TransportRoute::query()->where('active', true)
            ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('route_stops')->whereColumn('route_stops.transport_route_id', 'transport_routes.id'))
            ->when($origin, fn ($query) => $query->whereRaw('LOWER(TRIM(origin)) = LOWER(?)', [trim($origin)]))
            ->when($destination, fn ($query) => $query->whereRaw('LOWER(TRIM(destination)) = LOWER(?)', [trim($destination)]))
            ->pluck('id');

        return $stoppedRoutes->merge($legacyRoutes)->unique()->values();
    }
}
