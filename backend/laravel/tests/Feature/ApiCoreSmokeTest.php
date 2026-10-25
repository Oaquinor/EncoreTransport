<?php

namespace Tests\Feature;

use App\Models\Trip;
use Database\Seeders\EncoreTransportSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiCoreSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_api_and_seeded_seats_are_available(): void
    {
        $this->seed(EncoreTransportSeeder::class);
        $trip = Trip::query()->firstOrFail();

        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok');

        $this->getJson('/api/v1/routes')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/trips/'.$trip->id.'/seats')
            ->assertOk()
            ->assertJsonCount(55, 'data');
    }

    public function test_seeded_passenger_can_login(): void
    {
        $this->seed(EncoreTransportSeeder::class);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'passenger@example.test',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure(['token', 'expires_at', 'user' => ['id', 'email', 'role']]);
    }

    public function test_passenger_can_register_and_sign_in_with_the_new_account(): void
    {
        $registered = $this->postJson('/api/v1/auth/register', [
            'name' => 'Mobile Passenger',
            'email' => 'mobile.passenger@example.test',
            'phone' => '+5926000001',
            'password' => 'Passenger12345',
            'password_confirmation' => 'Passenger12345',
        ])
            ->assertCreated()
            ->assertJsonPath('user.role', 'passenger')
            ->assertJsonPath('user.email', 'mobile.passenger@example.test')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'mobile.passenger@example.test',
            'password' => 'Passenger12345',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $registered->json('user.id'));
    }
}
