<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\DriverLocation;
use App\Models\Role;
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

    public function test_assigned_driver_can_persist_location_during_boarding(): void
    {
        $trip = Trip::query()->firstOrFail();
        $trip->update(['status' => 'boarding']);
        $driverUser = $trip->driver?->user;

        $this->assertNotNull($driverUser);

        $recordedAt = now()->toISOString();

        $this->withToken($this->tokenFor($driverUser))
            ->postJson('/api/v1/driver/locations', [
                'trip_id' => $trip->id,
                'latitude' => 18.486058,
                'longitude' => -69.931212,
                'heading' => 90,
                'speed_kph' => 18.5,
                'recorded_at' => $recordedAt,
            ])
            ->assertCreated()
            ->assertJsonPath('data.trip_id', $trip->id)
            ->assertJsonPath('data.latitude', '18.4860580')
            ->assertJsonPath('data.longitude', '-69.9312120');

        $this->assertDatabaseHas('driver_locations', [
            'driver_id' => $trip->driver_id,
            'trip_id' => $trip->id,
            'latitude' => 18.486058,
            'longitude' => -69.931212,
            'speed_kph' => 18.5,
        ]);
    }

    public function test_driver_api_flow_supports_passenger_boarding_incidents_and_trip_completion(): void
    {
        $trip = Trip::query()->firstOrFail();
        $driverUser = $trip->driver?->user;
        $this->assertNotNull($driverUser);
        $token = $this->tokenFor($driverUser);
        $passenger = User::query()->where('role', 'passenger')->firstOrFail();
        $booking = Booking::query()->create([
            'public_id' => (string) Str::uuid(),
            'user_id' => $passenger->id,
            'reference' => 'ET-DRIVER-FLOW',
            'trip_id' => $trip->id,
            'passenger_name' => 'Boarding QA',
            'passenger_email' => 'boarding@example.test',
            'passenger_phone' => '',
            'seat_numbers' => ['1'],
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'total_amount' => 80,
        ]);
        $bookingPassenger = $booking->passengers()->create([
            'full_name' => 'Boarding QA',
            'email' => 'boarding@example.test',
            'status' => 'booked',
        ]);

        $this->withToken($token)->getJson('/api/v1/driver/me')->assertOk();
        $this->withToken($token)->getJson('/api/v1/driver/trips/current')
            ->assertOk()->assertJsonPath('data.id', $trip->id);
        $this->withToken($token)->getJson('/api/v1/driver/trips/'.$trip->id.'/passengers')
            ->assertOk()->assertJsonPath('data.0.id', $bookingPassenger->id);
        $this->withToken($token)->postJson('/api/v1/driver/trips/'.$trip->id.'/passengers/'.$bookingPassenger->id.'/board')
            ->assertOk()->assertJsonPath('data.status', 'boarded');

        $this->withToken($token)->postJson('/api/v1/driver/incidents', [
            'trip_id' => $trip->id,
            'title' => 'Driver flow QA incident',
            'description' => 'Recorded from the authenticated driver workflow.',
            'severity' => 'low',
        ])->assertCreated();
        $this->assertDatabaseHas('incidents', ['trip_id' => $trip->id, 'title' => 'Driver flow QA incident']);

        $this->withToken($token)->postJson('/api/v1/driver/trips/'.$trip->id.'/start')
            ->assertOk()->assertJsonPath('data.status', 'in_progress');
        $this->withToken($token)->postJson('/api/v1/driver/trips/'.$trip->id.'/complete')
            ->assertOk()->assertJsonPath('data.status', 'completed');
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
        $otherDriver = User::query()->create([
            'name' => 'Unassigned Driver',
            'email' => 'unassigned-driver@example.test',
            'role' => 'driver',
            'phone' => '+18095550009',
            'active' => true,
            'password' => 'password',
        ]);
        $otherDriver->roles()->attach(
            Role::query()->where('name', 'driver')->firstOrFail()->id
        );
        Driver::query()->create([
            'user_id' => $otherDriver->id,
            'name' => $otherDriver->name,
            'license_number' => 'D-QA-UNASSIGNED',
            'status' => 'upcoming',
        ]);

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
