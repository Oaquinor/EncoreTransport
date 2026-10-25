<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Bus;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminSurfaceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_authenticated_admin_can_manage_access_fleet_and_read_effective_permissions(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $adminToken = $this->tokenFor($admin);

        $permissions = $this->withToken($adminToken)->getJson('/api/v1/admin/permissions')
            ->assertOk()->assertJsonFragment(['key' => 'routes.view']);
        $this->assertNotEmpty($permissions->json('data'));
        $this->withToken($adminToken)->getJson('/api/v1/admin/users')->assertOk();
        $roles = $this->withToken($adminToken)->getJson('/api/v1/admin/roles')->assertOk();
        $passengerRole = Role::query()->where('name', 'passenger')->firstOrFail();
        $this->assertNotEmpty($roles->json('data'));

        $this->withToken($adminToken)->putJson('/api/v1/admin/roles/'.$passengerRole->id, [
            'label' => 'Passenger QA',
        ])->assertOk()->assertJsonPath('data.label', 'Passenger QA');

        $created = $this->withToken($adminToken)->postJson('/api/v1/admin/users', [
            'name' => 'Access QA User',
            'email' => 'access-qa@example.test',
            'role' => 'passenger',
            'role_ids' => [$passengerRole->id],
            'permission_grants' => ['routes.view' => true],
            'password' => 'AccessQA123',
        ])->assertCreated()->assertJsonPath('data.active', true);
        $userId = $created->json('data.id');
        $this->assertContains('routes.view', $created->json('data.permissions'));
        $newUser = User::query()->findOrFail($userId);
        $newUserToken = $this->tokenFor($newUser);
        $this->withToken($newUserToken)->getJson('/api/v1/auth/me')->assertOk()
            ->assertJsonFragment(['routes.view']);

        $this->withToken($adminToken)->putJson('/api/v1/admin/users/'.$userId, [
            'name' => 'Updated Access QA User',
            'email' => 'access-qa@example.test',
            'role' => 'passenger',
            'active' => true,
            'password' => null,
        ])->assertOk()->assertJsonPath('data.name', 'Updated Access QA User');
        $this->withToken($adminToken)->postJson('/api/v1/admin/users/'.$userId.'/disable')
            ->assertOk()->assertJsonPath('data.active', false);

        $driver = $this->withToken($adminToken)->postJson('/api/v1/admin/drivers', [
            'name' => 'Fleet QA Driver', 'license_number' => 'D-QA-8821', 'status' => 'active',
        ])->assertCreated();
        $driverId = $driver->json('data.id');
        $this->withToken($adminToken)->putJson('/api/v1/admin/drivers/'.$driverId, [
            'name' => 'Fleet QA Driver Updated', 'license_number' => 'D-QA-8821', 'status' => 'active',
        ])->assertOk()->assertJsonPath('data.name', 'Fleet QA Driver Updated');
        $this->withToken($adminToken)->postJson('/api/v1/admin/drivers/'.$driverId.'/deactivate')
            ->assertOk()->assertJsonPath('data.status', 'inactive');

        $vehicle = $this->withToken($adminToken)->postJson('/api/v1/admin/vehicles', [
            'code' => 'BUS-QA-8821', 'plate' => 'ET-QA-8821', 'capacity' => 2, 'status' => 'operational',
            'seats' => [
                ['seat_number' => 'A1', 'row_number' => 1, 'position_index' => 1, 'window' => true],
                ['seat_number' => 'A2', 'row_number' => 1, 'position_index' => 2, 'aisle' => true],
            ],
        ])->assertCreated()->assertJsonPath('data.seats.0.seat_number', 'A1');
        $busId = $vehicle->json('data.id');
        $this->withToken($adminToken)->putJson('/api/v1/admin/vehicles/'.$busId, [
            'code' => 'BUS-QA-8821', 'plate' => 'ET-QA-8822', 'capacity' => 2, 'status' => 'maintenance',
            'seats' => [
                ['seat_number' => 'A1', 'row_number' => 1, 'position_index' => 1, 'window' => true],
                ['seat_number' => 'A2', 'row_number' => 1, 'position_index' => 2, 'aisle' => true, 'accessible' => true, 'blocked' => true],
            ],
        ])->assertOk()->assertJsonPath('data.status', 'maintenance')
            ->assertJsonPath('data.seats.1.accessible', true)
            ->assertJsonPath('data.seats.1.blocked', true);
        $this->withToken($adminToken)->putJson('/api/v1/admin/vehicles/'.$busId, [
            'code' => 'BUS-QA-8821', 'plate' => 'ET-QA-8822', 'capacity' => 3, 'status' => 'maintenance',
            'seats' => [['seat_number' => 'A1'], ['seat_number' => 'A2']],
        ])->assertUnprocessable()->assertJsonValidationErrors('capacity');
        $this->assertInstanceOf(Bus::class, Bus::query()->findOrFail($busId));
        $this->assertInstanceOf(Driver::class, Driver::query()->findOrFail($driverId));
    }

    public function test_admin_booking_list_and_existing_detail_endpoint_supply_operational_context(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $booking = Booking::query()->where('reference', 'ET-DEMO-BOOKING')->firstOrFail();

        $dashboard = $this->withToken($this->tokenFor($admin))->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.bookings.0.reference', 'ET-DEMO-BOOKING')
            ->assertJsonPath('data.bookings.0.trip.route.origin', 'Georgetown')
            ->assertJsonPath('data.bookings.0.passengers_count', 0);

        $this->assertNotEmpty($dashboard->json('data.bookings.0.trip.bus.code'));
        $this->withToken($this->tokenFor($admin))->getJson('/api/v1/bookings/'.$booking->id)
            ->assertOk()
            ->assertJsonPath('data.reference', 'ET-DEMO-BOOKING')
            ->assertJsonPath('data.trip.route.destination', 'New Amsterdam')
            ->assertJsonStructure(['data' => ['reserved_seats', 'passengers', 'payments', 'ticket']]);

        $this->withToken($this->tokenFor($passenger))->getJson('/api/v1/bookings/'.$booking->id)
            ->assertOk()->assertJsonPath('data.user_id', $passenger->id);
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(80);
        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'admin-workflow-test',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addHour(),
        ]);
        return $plain;
    }
}
