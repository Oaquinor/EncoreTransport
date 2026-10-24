<?php

namespace Tests\Feature;

use App\Models\DriverLocation;
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
}
