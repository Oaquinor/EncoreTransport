<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\Driver;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminFleetController extends Controller
{
    public function drivers()
    {
        return response()->json(['data' => Driver::query()->with('user')->orderBy('name')->get()]);
    }

    public function storeDriver(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'license_number' => ['required', 'string', 'max:80', 'unique:drivers,license_number'],
            'status' => ['required', Rule::in(['pending', 'active', 'suspended', 'inactive'])],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $driver = Driver::query()->create($data);
        $audit->record($request->user(), 'driver.created', $driver, ['account_activation' => 'not_started']);

        return response()->json(['data' => $driver->load('user')], 201);
    }

    public function updateDriver(Request $request, Driver $driver, AuditService $audit)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'license_number' => ['required', 'string', 'max:80', Rule::unique('drivers', 'license_number')->ignore($driver->id)],
            'status' => ['required', Rule::in(['pending', 'active', 'suspended', 'inactive'])],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $driver->fill($data)->save();
        $audit->record($request->user(), 'driver.updated', $driver);

        return response()->json(['data' => $driver->fresh('user')]);
    }

    public function uploadDriverPhoto(Request $request, Driver $driver, AuditService $audit)
    {
        $data = $request->validate([
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if ($driver->photo_path) {
            Storage::disk('public')->delete($driver->photo_path);
        }

        $driver->update(['photo_path' => $data['photo']->store('drivers', 'public')]);
        $audit->record($request->user(), 'driver.photo_updated', $driver);

        return response()->json(['data' => $driver->fresh('user')]);
    }

    public function deactivateDriver(Request $request, Driver $driver, AuditService $audit)
    {
        if ($driver->trips()->whereIn('status', ['scheduled', 'boarding', 'in_progress'])->exists()) {
            return response()->json(['message' => 'This driver cannot be deactivated while assigned to an active trip.'], 409);
        }

        $driver->update(['status' => 'inactive']);
        $audit->record($request->user(), 'driver.deactivated', $driver);

        return response()->json(['data' => $driver->fresh('user')]);
    }

    public function vehicles()
    {
        return response()->json(['data' => Bus::query()->with('seats')->orderBy('code')->get()]);
    }

    public function storeVehicle(Request $request, AuditService $audit)
    {
        $data = $this->vehicleData($request);
        $seats = $data['seats'] ?? [];
        unset($data['seats']);

        $bus = DB::transaction(function () use ($data, $seats, $audit, $request) {
            $bus = Bus::query()->create($data);
            $this->replaceSeats($bus, $seats);
            $audit->record($request->user(), 'vehicle.created', $bus);
            return $bus->load('seats');
        });

        return response()->json(['data' => $bus], 201);
    }

    public function updateVehicle(Request $request, Bus $bus, AuditService $audit)
    {
        $data = $this->vehicleData($request, $bus);
        $seats = $data['seats'] ?? null;
        unset($data['seats']);

        $updated = DB::transaction(function () use ($data, $seats, $audit, $request, $bus) {
            if ($data['status'] === 'out_of_service' && $bus->trips()->whereIn('status', ['scheduled', 'boarding', 'in_progress'])->exists()) {
                abort(409, 'Vehicle cannot be taken out of service while it has active trips.');
            }

            if ($seats !== null && $bus->trips()->whereHas('bookings', fn ($query) => $query->whereIn('status', ['pending_payment', 'confirmed']))->exists()) {
                abort(409, 'Seat configuration cannot change while the vehicle has active bookings.');
            }

            $bus->fill($data)->save();
            if ($seats !== null) $this->replaceSeats($bus, $seats);
            $audit->record($request->user(), 'vehicle.updated', $bus);
            return $bus->fresh('seats');
        });

        return response()->json(['data' => $updated]);
    }

    private function vehicleData(Request $request, ?Bus $bus = null): array
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('buses', 'code')->ignore($bus?->id)],
            'plate' => ['required', 'string', 'max:50', Rule::unique('buses', 'plate')->ignore($bus?->id)],
            'capacity' => ['required', 'integer', 'min:1', 'max:500'],
            'status' => ['required', Rule::in(['operational', 'maintenance', 'out_of_service'])],
            'seats' => ['sometimes', 'array', 'max:500'],
            'seats.*.seat_number' => ['required_with:seats', 'string', 'max:16', 'distinct'],
            'seats.*.row_number' => ['nullable', 'integer', 'min:1'],
            'seats.*.position_index' => ['nullable', 'integer', 'min:1'],
            'seats.*.seat_class' => ['nullable', 'string', 'max:32'],
            'seats.*.seat_type' => ['nullable', 'string', 'max:32'],
            'seats.*.active' => ['sometimes', 'boolean'],
            'seats.*.window' => ['sometimes', 'boolean'],
            'seats.*.aisle' => ['sometimes', 'boolean'],
            'seats.*.accessible' => ['sometimes', 'boolean'],
            'seats.*.blocked' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('seats', $data) && count($data['seats']) !== (int) $data['capacity']) {
            throw ValidationException::withMessages(['capacity' => 'Capacity must match the number of configured seats.']);
        }
        return $data;
    }

    private function replaceSeats(Bus $bus, array $seats): void
    {
        if ($seats === []) {
            $seats = array_map(
                fn ($number) => ['seat_number' => (string) $number],
                range(1, (int) $bus->capacity),
            );
        }

        $bus->seats()->delete();
        foreach (array_values($seats) as $index => $seat) {
            $bus->seats()->create([
                'seat_number' => $seat['seat_number'],
                'row_number' => $seat['row_number'] ?? intdiv($index, 4) + 1,
                'position_index' => $seat['position_index'] ?? ($index % 4) + 1,
                'seat_class' => $seat['seat_class'] ?? 'standard',
                'seat_type' => $seat['seat_type'] ?? 'seat',
                'active' => $seat['active'] ?? true,
                'window' => $seat['window'] ?? false,
                'aisle' => $seat['aisle'] ?? false,
                'accessible' => $seat['accessible'] ?? false,
                'blocked' => $seat['blocked'] ?? false,
            ]);
        }
    }
}
