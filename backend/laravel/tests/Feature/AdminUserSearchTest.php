<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_admin_user_directory_supports_server_side_search_filters_and_pagination(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        ApiToken::query()->create(['user_id' => $admin->id, 'token_hash' => hash('sha256', 'admin-user-search'), 'last_used_at' => now()]);
        User::query()->create(['name' => 'Directory Search QA', 'email' => 'directory-search@example.test', 'phone' => '555-0101', 'role' => 'passenger', 'active' => true, 'password' => bcrypt('Password123')]);

        $response = $this->withToken('admin-user-search')->getJson('/api/v1/admin/users?q=Directory%20Search&per_page=10');

        $response->assertOk()
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.email', 'directory-search@example.test');
        $this->assertSame(0, $response->json('data.0.booking_count'));
    }
}
