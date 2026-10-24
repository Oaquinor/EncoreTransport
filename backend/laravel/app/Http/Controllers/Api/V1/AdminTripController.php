<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\TransportRoute;
use App\Models\Trip;
use App\Services\Audit\AuditService;
use App\Services\Auth\PermissionService;
use App\Services\Trips\TripStateService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminTripController extends Controller
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function index()
    {
        $trips = Trip::query()->with(['route', 'bus', 'driver'])
            ->orderByDesc('departure_date')->orderBy('departure_time')->limit(300)->get();

        return response()->json(['data' => TripResource::collection($trips)]);
    }

    public function store(Request $request, AuditService $audit)
    {
        $data = $this->validated($request);
        $this->assertAssignmentPermissions($request, $data);

        $trip = DB::transaction(function () use ($data, $request, $audit) {
            $route = TransportRoute::query()->whereKey($data['transport_route_id'])->where('active', true)->first();
            if (!$route) throw ValidationException::withMessages(['transport_route_id' => 'Choose an active route.']);

            $bus = Bus::query()->lockForUpdate()->findOrFail($data['bus_id']);
            if ($bus->status !== 'operational') throw ValidationException::withMessages(['bus_id' => 'Choose an operational vehicle.']);

            $driver = Driver::query()->lockForUpdate()->findOrFail($data['driver_id']);
            if (!in_array($driver->status, ['active', 'upcoming'], true)) {
                throw ValidationException::withMessages(['driver_id' => 'Choose an active driver.']);
            }

            $availableSeats = $bus->seats()->where('active', true)->where('blocked', false)->count();
            if ($availableSeats < 1) throw ValidationException::withMessages(['bus_id' => 'The selected vehicle has no available seats configured.']);

            $this->assertNoAssignmentConflict($data);

            $trip = Trip::query()->create($data + ['status' => 'scheduled', 'available_seats' => $availableSeats]);
            $audit->record($request->user(), 'trip.created', $trip);
            return $trip->load(['route', 'bus', 'driver']);
        });

        return (new TripResource($trip))->response()->setStatusCode(201);
    }

    public function update(Request $request, Trip $trip, AuditService $audit)
    {
        $data = $this->validated($request);
        $this->assertAssignmentPermissions($request, $data, $trip);

        $result = DB::transaction(function () use ($data, $trip, $request, $audit) {
            $trip = Trip::query()->lockForUpdate()->findOrFail($trip->id);
            if ($trip->status !== 'scheduled') {
                return response()->json(['message' => 'Only scheduled trips can be edited.'], 409);
            }
            if ($trip->bookings()->whereIn('status', ['pending_payment', 'confirmed'])->exists()) {
                return response()->json(['message' => 'A trip with held or confirmed bookings cannot be edited.'], 409);
            }

            $route = TransportRoute::query()->whereKey($data['transport_route_id'])->where('active', true)->first();
            if (!$route) throw ValidationException::withMessages(['transport_route_id' => 'Choose an active route.']);

            $bus = Bus::query()->lockForUpdate()->findOrFail($data['bus_id']);
            if ($bus->status !== 'operational') throw ValidationException::withMessages(['bus_id' => 'Choose an operational vehicle.']);

            $driver = Driver::query()->lockForUpdate()->findOrFail($data['driver_id']);
            if (!in_array($driver->status, ['active', 'upcoming'], true)) {
                throw ValidationException::withMessages(['driver_id' => 'Choose an active driver.']);
            }

            $this->assertNoAssignmentConflict($data, $trip->id);

            $trip->fill($data + ['available_seats' => $bus->seats()->where('active', true)->where('blocked', false)->count()])->save();
            $audit->record($request->user(), 'trip.updated', $trip);
            return new TripResource($trip->fresh(['route', 'bus', 'driver']));
        });

        return $result;
    }

    public function cancel(Request $request, Trip $trip, TripStateService $states)
    {
        if ($trip->bookings()->whereIn('status', ['pending_payment', 'confirmed'])->exists()) {
            return response()->json(['message' => 'Cancel or resolve held and confirmed bookings before cancelling this trip.'], 409);
        }

        return new TripResource($states->transition($trip, 'cancelled', $request->user()));
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'transport_route_id' => ['required', 'integer', 'exists:transport_routes,id'],
            'bus_id' => ['required', 'integer', 'exists:buses,id'],
            'driver_id' => ['required', 'integer', 'exists:drivers,id'],
            'departure_date' => ['required', 'date', 'after_or_equal:today'],
            'departure_time' => ['required', 'date_format:H:i'],
            'arrival_time' => ['required', 'date_format:H:i'],
            'price_per_passenger' => ['required', 'integer', 'min:0'],
        ]);
        if ($data['departure_time'] === $data['arrival_time']) {
            throw ValidationException::withMessages(['arrival_time' => 'Departure and arrival times must differ.']);
        }

        return $data;
    }

    private function assertNoAssignmentConflict(array $data, ?int $ignoreTripId = null): void
    {
        $start = CarbonImmutable::parse($data['departure_date'].' '.$data['departure_time']);
        $end = CarbonImmutable::parse($data['departure_date'].' '.$data['arrival_time']);
        if (!$end->greaterThan($start)) $end = $end->addDay();

        $from = $start->subDay()->toDateString();
        $through = $end->toDateString();
        $assignments = Trip::query()
            ->whereIn('status', ['scheduled', 'boarding', 'in_progress'])
            ->whereBetween('departure_date', [$from, $through])
            ->where(function ($query) use ($data) {
                $query->where('bus_id', $data['bus_id'])
                    ->orWhere('driver_id', $data['driver_id']);
            })
            ->when($ignoreTripId, fn ($query) => $query->where('id', '!=', $ignoreTripId))
            ->get(['id', 'bus_id', 'driver_id', 'departure_date', 'departure_time', 'arrival_time']);

        foreach ($assignments as $assigned) {
            $assignedStart = CarbonImmutable::parse($assigned->departure_date->toDateString().' '.$assigned->departure_time);
            $assignedEnd = CarbonImmutable::parse($assigned->departure_date->toDateString().' '.$assigned->arrival_time);
            if (!$assignedEnd->greaterThan($assignedStart)) $assignedEnd = $assignedEnd->addDay();

            if ($start->lessThan($assignedEnd) && $end->greaterThan($assignedStart)) {
                $resource = (int) $assigned->bus_id === (int) $data['bus_id'] ? 'bus_id' : 'driver_id';
                throw ValidationException::withMessages([$resource => 'The selected '.($resource === 'bus_id' ? 'vehicle' : 'driver').' has an overlapping trip assignment.']);
            }
        }
    }

    private function assertAssignmentPermissions(Request $request, array $data, ?Trip $trip = null): void
    {
        $user = $request->user();
        if (!$trip || (int) $trip->driver_id !== (int) $data['driver_id']) {
            if (!$this->permissions->allows($user, 'trips.assign_driver')) abort(403, 'Assigning a driver requires trips.assign_driver.');
        }
        if (!$trip || (int) $trip->bus_id !== (int) $data['bus_id']) {
            if (!$this->permissions->allows($user, 'trips.assign_vehicle')) abort(403, 'Assigning a vehicle requires trips.assign_vehicle.');
        }
    }
}
