<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Permission;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_effective_permissions_are_returned_and_passenger_cannot_access_admin_route_api(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();

        $adminResponse = $this->withToken($this->tokenFor($admin))->getJson('/api/v1/auth/me')->assertOk();
        $this->assertContains('routes.create', $adminResponse->json('permissions'));

        $this->withToken($this->tokenFor($passenger))
            ->getJson('/api/v1/admin/routes')
            ->assertForbidden();
    }

    public function test_direct_permission_revocation_overrides_role_permission(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $permission = Permission::query()->where('key', 'routes.create')->firstOrFail();

        $admin->permissions()->syncWithoutDetaching([
            $permission->id => ['granted' => false, 'assigned_by_user_id' => $admin->id],
        ]);

        $this->withToken($this->tokenFor($admin))
            ->postJson('/api/v1/admin/routes', [
                'origin' => 'Georgetown',
                'destination' => 'Linden',
                'distance_km' => 105,
                'active' => true,
            ])
            ->assertForbidden();
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
