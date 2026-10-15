<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Trip;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClientPrioritiesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_seat_endpoint_returns_persisted_layout_metadata(): void
    {
        $trip = Trip::query()->firstOrFail();
        $this->getJson('/api/v1/trips/'.$trip->id.'/seats')
            ->assertOk()
            ->assertJsonPath('data.0.row_number', 1)
            ->assertJsonPath('data.0.position_index', 1);
    }

    public function test_driver_can_register_package_and_public_tracking_does_not_expose_contact_data(): void
    {
        $trip = Trip::query()->firstOrFail();
        $driver = User::query()->where('role', 'driver')->firstOrFail();
        $response = $this->withToken($this->tokenFor($driver))->postJson('/api/v1/driver/packages', [
            'trip_id' => $trip->id,
            'recipient_name' => 'Recipient Test',
            'recipient_phone' => '+18095551234',
            'recipient_email' => 'recipient@example.test',
            'description' => 'Small parcel',
        ])->assertCreated();

        $token = $response->json('data.tracking_token');
        $tracking = $this->getJson('/api/v1/packages/track/'.$token)->assertOk();
        $tracking->assertJsonMissing(['recipient_phone' => '+18095551234']);
        $tracking->assertJsonMissing(['recipient_email' => 'recipient@example.test']);
        $tracking->assertJsonPath('data.status', 'received');
    }

    public function test_admin_schedule_rejects_overlapping_driver_assignment(): void
    {
        $trip = Trip::query()->firstOrFail();
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $token = $this->tokenFor($admin);
        $payload = [
            'driver_id' => $trip->driver_id,
            'bus_id' => $trip->bus_id,
            'trip_id' => $trip->id,
            'work_date' => now()->addDay()->toDateString(),
            'starts_at' => '08:00',
            'ends_at' => '12:00',
            'status' => 'scheduled',
        ];
        $this->withToken($token)->postJson('/api/v1/admin/driver-schedules', $payload)->assertCreated();
        $this->withToken($token)->postJson('/api/v1/admin/driver-schedules', $payload)->assertStatus(422);
    }

    public function test_admin_can_create_edit_and_deactivate_route(): void
    {
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $passenger = User::query()->where('role', 'passenger')->firstOrFail();
        $adminToken = $this->tokenFor($admin);
        $payload = [
            'origin' => 'Georgetown',
            'destination' => 'Linden',
            'distance_km' => 105,
            'active' => true,
            'stops' => [
                ['name' => 'Soesdyke Junction'],
                ['name' => 'Timehri'],
            ],
        ];

        $created = $this->withToken($adminToken)
            ->postJson('/api/v1/admin/routes', $payload)
            ->assertCreated()
            ->assertJsonPath('data.origin', 'Georgetown')
            ->assertJsonCount(2, 'data.stops');

        $routeId = $created->json('data.id');

        $this->withToken($this->tokenFor($passenger))
            ->postJson('/api/v1/admin/routes', $payload)
            ->assertForbidden();

        $this->withToken($adminToken)
            ->putJson('/api/v1/admin/routes/'.$routeId, [
                ...$payload,
                'destination' => 'Mackenzie',
                'active' => false,
                'stops' => [['name' => 'Timehri']],
            ])
            ->assertOk()
            ->assertJsonPath('data.destination', 'Mackenzie')
            ->assertJsonPath('data.active', false)
            ->assertJsonCount(1, 'data.stops');

        $this->getJson('/api/v1/routes/'.$routeId)->assertNotFound();
    }

    public function test_admin_can_create_driver_and_vehicle_but_passenger_cannot(): void
    {
        $adminToken = $this->tokenFor(User::query()->where('role', 'admin')->firstOrFail());
        $passengerToken = $this->tokenFor(User::query()->where('role', 'passenger')->firstOrFail());

        $this->withToken($passengerToken)
            ->postJson('/api/v1/admin/drivers', [
                'name' => 'Unauthorized Driver',
                'license_number' => 'TEST-UNAUTHORIZED',
                'status' => 'pending',
            ])
            ->assertForbidden();

        $this->withToken($adminToken)
            ->postJson('/api/v1/admin/drivers', [
                'name' => 'Fleet Driver',
                'license_number' => 'TEST-FLEET-001',
                'status' => 'pending',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->withToken($adminToken)
            ->postJson('/api/v1/admin/vehicles', [
                'code' => 'TEST-VEHICLE-001',
                'plate' => 'TEST-PLATE-001',
                'capacity' => 12,
                'status' => 'operational',
            ])
            ->assertCreated()
            ->assertJsonCount(12, 'data.seats');
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(80);
        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'test',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addHour(),
        ]);
        return $plain;
    }
}
