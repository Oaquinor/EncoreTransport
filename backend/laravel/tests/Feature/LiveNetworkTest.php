<?php

namespace Tests\Feature;

use App\Models\DriverLocation;
use App\Models\Bus;
use App\Models\Trip;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveNetworkTest extends TestCase
{
    use RefreshDatabase;

    public function test_live_network_returns_only_public_latest_vehicle_data(): void
    {
        $this->seed(EncoreTransportDemoSeeder::class);
        $trip = Trip::query()->firstOrFail();
        $trip->forceFill(['status' => 'in_progress'])->save();
        DriverLocation::query()->create([
            'driver_id' => $trip->driver_id,
            'trip_id' => $trip->id,
            'latitude' => 6.8013,
            'longitude' => -58.1551,
            'heading' => 90,
            'recorded_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/network/live')->assertOk();
        $response->assertJsonPath('data.trips.0.trip_id', (string) $trip->id);
        $response->assertJsonPath('data.trips.0.bus_code', 'BUS-001');
        $this->assertArrayNotHasKey('driver', $response->json('data.trips.0'));
        $this->assertArrayNotHasKey('driver_id', $response->json('data.trips.0'));
        $this->assertArrayNotHasKey('phone', $response->json('data.trips.0'));
    }

    public function test_public_network_separates_current_positions_from_stale_and_non_running_trips(): void
    {
        $this->seed(EncoreTransportDemoSeeder::class);
        $scheduled = Trip::query()->firstOrFail();
        DriverLocation::query()->create([
            'driver_id' => $scheduled->driver_id,
            'trip_id' => $scheduled->id,
            'latitude' => 6.8013,
            'longitude' => -58.1551,
            'recorded_at' => now(),
        ]);

        $secondBus = Bus::query()->create(['code' => 'BUS-002', 'plate' => 'ET-002-QA', 'capacity' => 20, 'status' => 'operational']);
        $activeTrip = Trip::query()->create([
            'transport_route_id' => $scheduled->transport_route_id,
            'bus_id' => $secondBus->id,
            'driver_id' => $scheduled->driver_id,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->format('H:i:s'),
            'arrival_time' => now()->addHours(2)->format('H:i:s'),
            'status' => 'in_progress',
            'available_seats' => 20,
            'price_per_passenger' => 85,
        ]);
        DriverLocation::query()->create([
            'driver_id' => $activeTrip->driver_id,
            'trip_id' => $activeTrip->id,
            'latitude' => 6.8100,
            'longitude' => -58.1600,
            'recorded_at' => now()->subMinutes(2),
        ]);

        $thirdBus = Bus::query()->create(['code' => 'BUS-003', 'plate' => 'ET-003-QA', 'capacity' => 20, 'status' => 'operational']);
        $secondActiveTrip = Trip::query()->create([
            'transport_route_id' => $scheduled->transport_route_id,
            'bus_id' => $thirdBus->id,
            'driver_id' => $scheduled->driver_id,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->addSeconds(10)->format('H:i:s'),
            'arrival_time' => now()->addHours(2)->format('H:i:s'),
            'status' => 'in_progress',
            'available_seats' => 20,
            'price_per_passenger' => 85,
        ]);
        DriverLocation::query()->create([
            'driver_id' => $secondActiveTrip->driver_id,
            'trip_id' => $secondActiveTrip->id,
            'latitude' => 6.8150,
            'longitude' => -58.1650,
            'recorded_at' => now()->subMinute(),
        ]);

        $staleTrip = Trip::query()->create([
            'transport_route_id' => $scheduled->transport_route_id,
            'bus_id' => $scheduled->bus_id,
            'driver_id' => $scheduled->driver_id,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->addMinute()->format('H:i:s'),
            'arrival_time' => now()->addHours(2)->format('H:i:s'),
            'status' => 'in_progress',
            'available_seats' => 20,
            'price_per_passenger' => 85,
        ]);
        DriverLocation::query()->create([
            'driver_id' => $staleTrip->driver_id,
            'trip_id' => $staleTrip->id,
            'latitude' => 6.8200,
            'longitude' => -58.1700,
            'recorded_at' => now()->subMinutes(8),
        ]);

        $response = $this->getJson('/api/v1/network/live')->assertOk();
        $response->assertJsonCount(3, 'data.trips');
        $response->assertJsonPath('data.trips.0.is_stale', false);
        $response->assertJsonPath('data.trips.0.bus_code', 'BUS-002');
        $response->assertJsonPath('data.trips.1.is_stale', false);
        $response->assertJsonPath('data.trips.1.bus_code', 'BUS-003');
        $response->assertJsonPath('data.trips.2.is_stale', true);
        $response->assertJsonPath('data.trips.2.latitude', null);
        $response->assertJsonPath('data.trips.2.longitude', null);
        $tripIds = collect($response->json('data.trips'))->pluck('trip_id');
        $this->assertNotContains((string) $scheduled->id, $tripIds);
    }
}
