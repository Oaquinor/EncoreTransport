<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Permission;
use App\Models\Role;
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

        $adminResponse = $this->withToken($this->tokenFor($admin))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
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

    public function test_user_management_cannot_escalate_role_without_roles_manage(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $usersUpdate = Permission::query()->where('key', 'users.update')->firstOrFail();
        $admin->permissions()->syncWithoutDetaching([
            $usersUpdate->id => ['granted' => true, 'assigned_by_user_id' => $admin->id],
        ]);
        $admin->roles()->detach(Role::query()->where('name', 'superadmin')->value('id'));

        $this->withToken($this->tokenFor($admin))
            ->putJson('/api/v1/admin/users/'.$passenger->id, [
                'name' => $passenger->name,
                'email' => $passenger->email,
                'role' => 'passenger',
                'role_ids' => [Role::query()->where('name', 'superadmin')->value('id')],
                'password' => null,
            ])
            ->assertForbidden();
    }

    public function test_user_profile_update_does_not_require_access_assignment_permissions(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $usersUpdate = Permission::query()->where('key', 'users.update')->firstOrFail();
        $admin->roles()->detach();
        $admin->permissions()->sync([$usersUpdate->id => ['granted' => true, 'assigned_by_user_id' => $admin->id]]);

        $this->withToken($this->tokenFor($admin))
            ->putJson('/api/v1/admin/users/'.$passenger->id, [
                'name' => 'Updated passenger',
                'email' => $passenger->email,
                'phone' => '+5920000000',
                'active' => true,
                'password' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated passenger');
    }

    public function test_effective_system_administrator_can_assign_direct_permission_with_legacy_admin_role(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $this->assertTrue($admin->roles()->where('name', 'superadmin')->exists());

        $this->withToken($this->tokenFor($admin))
            ->putJson('/api/v1/admin/users/'.$passenger->id, [
                'name' => $passenger->name,
                'email' => $passenger->email,
                'role' => 'passenger',
                'permission_grants' => ['routes.view' => true],
                'password' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.direct_permissions.0.key', 'routes.view');
    }

    public function test_inherit_permission_removes_direct_override_and_restores_role_permission(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $permission = Permission::query()->create(['key' => 'test.saved_trip', 'label' => 'Saved trip', 'resource' => 'trips']);
        $role = Role::query()->create(['name' => 'test_saved_trip_reader', 'label' => 'Saved trip reader', 'system' => false]);
        $role->permissions()->attach($permission->id);
        $passenger->roles()->sync([$role->id]);
        $passenger->permissions()->sync([$permission->id => ['granted' => false, 'assigned_by_user_id' => $admin->id]]);

        $response = $this->withToken($this->tokenFor($admin))->putJson('/api/v1/admin/users/'.$passenger->id, [
            'name' => $passenger->name,
            'email' => $passenger->email,
            'role' => 'passenger',
            'permission_grants' => ['test.saved_trip' => null],
            'password' => null,
        ])->assertOk();

        $this->assertContains('test.saved_trip', $response->json('data.permissions'));
        $this->assertSame([], $response->json('data.direct_permissions'));
    }

    public function test_role_assignment_cannot_grant_permissions_actor_does_not_hold(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $admin->roles()->detach();
        $rolesManage = Permission::query()->where('key', 'roles.manage')->firstOrFail();
        $financeView = Permission::query()->where('key', 'payments.view')->firstOrFail();
        $admin->permissions()->sync([$rolesManage->id => ['granted' => true, 'assigned_by_user_id' => $admin->id]]);
        $financeRole = Role::query()->create(['name' => 'test_finance_reader', 'label' => 'Finance reader', 'system' => false]);
        $financeRole->permissions()->attach($financeView->id);

        $this->withToken($this->tokenFor($admin))->putJson('/api/v1/admin/users/'.$passenger->id, [
            'name' => $passenger->name,
            'email' => $passenger->email,
            'role' => 'passenger',
            'role_ids' => [$financeRole->id],
            'password' => null,
        ])->assertForbidden();
    }

    public function test_access_editors_can_load_lists_when_they_have_manage_or_assign_permissions(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $admin->roles()->detach();
        $grants = Permission::query()->whereIn('key', ['users.view', 'roles.manage', 'permissions.assign'])->pluck('id')
            ->mapWithKeys(fn ($id) => [$id => ['granted' => true, 'assigned_by_user_id' => $admin->id]])
            ->all();
        $admin->permissions()->sync($grants);

        $this->withToken($this->tokenFor($admin))->getJson('/api/v1/admin/roles')->assertOk();
        $this->withToken($this->tokenFor($admin))->getJson('/api/v1/admin/permissions')->assertOk();
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
