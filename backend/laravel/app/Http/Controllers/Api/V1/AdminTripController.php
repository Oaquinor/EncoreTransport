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

            $driver = Driver::query()->findOrFail($data['driver_id']);
            if (!in_array($driver->status, ['active', 'upcoming'], true)) {
                throw ValidationException::withMessages(['driver_id' => 'Choose an active driver.']);
            }

            $availableSeats = $bus->seats()->where('active', true)->where('blocked', false)->count();
            if ($availableSeats < 1) throw ValidationException::withMessages(['bus_id' => 'The selected vehicle has no available seats configured.']);

            $trip = Trip::query()->create($data + ['status' => 'scheduled', 'available_seats' => $availableSeats]);
            $audit->record($request->user(), 'trip.created', $trip);
            return $trip->load(['route', 'bus', 'driver']);
        });

        return (new TripResource($trip))->response()->setStatusCode(201);
    }

    public function update(Request $request, Trip $trip, AuditService $audit)
    {
        if ($trip->status !== 'scheduled') {
            return response()->json(['message' => 'Only scheduled trips can be edited.'], 409);
        }
        if ($trip->bookings()->whereIn('status', ['pending_payment', 'confirmed'])->exists()) {
            return response()->json(['message' => 'A trip with held or confirmed bookings cannot be edited.'], 409);
        }

        $data = $this->validated($request);
        $this->assertAssignmentPermissions($request, $data, $trip);

        $updated = DB::transaction(function () use ($data, $trip, $request, $audit) {
            $route = TransportRoute::query()->whereKey($data['transport_route_id'])->where('active', true)->first();
            if (!$route) throw ValidationException::withMessages(['transport_route_id' => 'Choose an active route.']);

            $bus = Bus::query()->lockForUpdate()->findOrFail($data['bus_id']);
            if ($bus->status !== 'operational') throw ValidationException::withMessages(['bus_id' => 'Choose an operational vehicle.']);

            $driver = Driver::query()->findOrFail($data['driver_id']);
            if (!in_array($driver->status, ['active', 'upcoming'], true)) {
                throw ValidationException::withMessages(['driver_id' => 'Choose an active driver.']);
            }

            $trip->fill($data + ['available_seats' => $bus->seats()->where('active', true)->where('blocked', false)->count()])->save();
            $audit->record($request->user(), 'trip.updated', $trip);
            return $trip->fresh(['route', 'bus', 'driver']);
        });

        return new TripResource($updated);
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
        return $request->validate([
            'transport_route_id' => ['required', 'integer', 'exists:transport_routes,id'],
            'bus_id' => ['required', 'integer', 'exists:buses,id'],
            'driver_id' => ['required', 'integer', 'exists:drivers,id'],
            'departure_date' => ['required', 'date', 'after_or_equal:today'],
            'departure_time' => ['required', 'date_format:H:i'],
            'arrival_time' => ['required', 'date_format:H:i'],
            'price_per_passenger' => ['required', 'integer', 'min:0'],
        ]);
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
