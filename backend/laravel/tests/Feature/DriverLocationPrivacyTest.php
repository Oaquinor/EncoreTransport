<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\DriverLocation;
use App\Models\Trip;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DriverLocationPrivacyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_precise_driver_location_is_not_public(): void
    {
        $trip = Trip::query()->firstOrFail();

        DriverLocation::query()->create([
            'driver_id' => $trip->driver_id,
            'trip_id' => $trip->id,
            'latitude' => 18.486058,
            'longitude' => -69.931212,
            'heading' => 90,
            'speed_kph' => 25,
            'recorded_at' => now(),
        ]);

        $this->getJson(
            '/api/v1/trips/'.$trip->id.'/location'
        )->assertUnauthorized();
    }

    public function test_assigned_driver_can_read_current_trip_location(): void
    {
        $trip = Trip::query()->firstOrFail();
        $driverUser = $trip->driver?->user;

        $this->assertNotNull($driverUser);

        DriverLocation::query()->create([
            'driver_id' => $trip->driver_id,
            'trip_id' => $trip->id,
            'latitude' => 18.486058,
            'longitude' => -69.931212,
            'recorded_at' => now(),
        ]);

        $this->withToken(
            $this->tokenFor($driverUser)
        )
            ->getJson(
                '/api/v1/trips/'.$trip->id.'/location'
            )
            ->assertOk()
            ->assertJsonPath(
                'data.trip_id',
                $trip->id
            );
    }

    public function test_driver_can_load_their_current_or_next_trip(): void
    {
        $trip = Trip::query()->firstOrFail();
        $driverUser = $trip->driver?->user;

        $this->assertNotNull($driverUser);

        $this->withToken($this->tokenFor($driverUser))
            ->getJson('/api/v1/driver/trips/current')
            ->assertOk()
            ->assertJsonPath('data.id', $trip->id)
            ->assertJsonPath('data.status', $trip->status);
    }

    public function test_driver_can_save_vehicle_condition_with_a_fuel_reading(): void
    {
        $trip = Trip::query()->firstOrFail();
        $driverUser = $trip->driver?->user;

        $this->assertNotNull($driverUser);

        $this->withToken($this->tokenFor($driverUser))
            ->postJson('/api/v1/driver/vehicle-status', [
                'trip_id' => $trip->id,
                'fuel_percent' => 68,
                'engine_status' => 'ok',
                'tires_status' => 'warning',
                'network_status' => 'online',
            ])
            ->assertCreated()
            ->assertJsonPath('data.fuel_percent', 68)
            ->assertJsonPath('data.engine_status', 'ok');
    }

    public function test_admin_can_read_current_trip_location(): void
    {
        $trip = Trip::query()->firstOrFail();
        $admin = User::query()
            ->where('role', 'admin')
            ->firstOrFail();

        DriverLocation::query()->create([
            'driver_id' => $trip->driver_id,
            'trip_id' => $trip->id,
            'latitude' => 18.486058,
            'longitude' => -69.931212,
            'recorded_at' => now(),
        ]);

        $this->withToken(
            $this->tokenFor($admin)
        )
            ->getJson(
                '/api/v1/trips/'.$trip->id.'/location'
            )
            ->assertOk();
    }

    public function test_passenger_can_read_location_for_their_booked_trip_only(): void
    {
        $trip = Trip::query()->firstOrFail();
        $passenger = User::query()
            ->where('role', 'passenger')
            ->where('email', 'passenger@example.test')
            ->firstOrFail();

        DriverLocation::query()->create([
            'driver_id' => $trip->driver_id,
            'trip_id' => $trip->id,
            'latitude' => 18.486058,
            'longitude' => -69.931212,
            'recorded_at' => now(),
        ]);

        $seat = $trip->bus->seats()->firstOrFail();
        $this->withToken($this->tokenFor($passenger))
            ->postJson('/api/v1/bookings', [
                'trip_id' => $trip->id,
                'seat_ids' => [$seat->id],
                'passengers' => [['full_name' => 'Passenger Location Test']],
            ])
            ->assertCreated();

        $this->withToken($this->tokenFor($passenger))
            ->getJson('/api/v1/trips/'.$trip->id.'/location')
            ->assertOk()
            ->assertJsonPath('data.trip_id', $trip->id);

        $otherTrip = Trip::query()->whereKeyNot($trip->id)->first();
        if (!$otherTrip) {
            return;
        }

        $this->withToken($this->tokenFor($passenger))
            ->getJson('/api/v1/trips/'.$otherTrip->id.'/location')
            ->assertForbidden();
    }

    public function test_unassigned_driver_cannot_read_other_trip_location(): void
    {
        $trip = Trip::query()->firstOrFail();

        $otherDriver = User::query()
            ->where('role', 'driver')
            ->whereKeyNot(
                $trip->driver?->user_id
            )
            ->first();

        if (!$otherDriver) {
            $this->markTestSkipped(
                'Demo seed contains only one driver account.'
            );
        }

        $this->withToken(
            $this->tokenFor($otherDriver)
        )
            ->getJson(
                '/api/v1/trips/'.$trip->id.'/location'
            )
            ->assertForbidden();
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(80);

        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'test',
            'token_hash' => hash(
                'sha256',
                $plain
            ),
            'expires_at' =>
                now()->addHour(),
        ]);

        return $plain;
    }
}
