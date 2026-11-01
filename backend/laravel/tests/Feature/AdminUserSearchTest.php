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

    public function test_customer_directory_paginates_passengers_on_the_server(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        ApiToken::query()->create(['user_id' => $admin->id, 'token_hash' => hash('sha256', 'admin-customer-pages'), 'last_used_at' => now()]);
        for ($index = 1; $index <= 22; $index++) {
            User::query()->create(['name' => sprintf('Customer Page %02d', $index), 'email' => sprintf('customer-page-%02d@example.test', $index), 'role' => 'passenger', 'active' => true, 'password' => bcrypt('Password123')]);
        }

        $pageOne = $this->withToken('admin-customer-pages')->getJson('/api/v1/admin/users?role=passenger&per_page=10&page=1')->assertOk();
        $pageTwo = $this->withToken('admin-customer-pages')->getJson('/api/v1/admin/users?role=passenger&per_page=10&page=2')->assertOk();

        $pageOne->assertJsonPath('meta.current_page', 1)->assertJsonPath('meta.last_page', 3)->assertJsonPath('meta.total', 23);
        $pageTwo->assertJsonPath('meta.current_page', 2);
        $this->assertNotSame($pageOne->json('data.0.id'), $pageTwo->json('data.0.id'));
    }

    public function test_admin_user_detail_tabs_use_authorized_independent_endpoints(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        ApiToken::query()->create(['user_id' => $admin->id, 'token_hash' => hash('sha256', 'admin-user-detail'), 'last_used_at' => now()]);
        $headers = ['Authorization' => 'Bearer admin-user-detail'];

        $this->getJson('/api/v1/admin/users/' . $passenger->id, $headers)->assertOk()->assertJsonPath('data.email', $passenger->email);
        foreach (['bookings', 'tickets', 'packages', 'activity'] as $tab) {
            $this->getJson('/api/v1/admin/users/' . $passenger->id . '/' . $tab . '?per_page=10', $headers)
                ->assertOk()->assertJsonStructure(['data', 'meta']);
        }
        $this->getJson('/api/v1/admin/users/' . $passenger->id . '/permissions', $headers)
            ->assertOk()->assertJsonStructure(['data' => ['roles', 'direct', 'effective']]);
    }
}
