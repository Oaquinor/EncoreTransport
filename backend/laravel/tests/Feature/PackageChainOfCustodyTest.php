<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Driver;
use App\Models\PackageManifest;
use App\Models\Role;
use App\Models\TransportPackage;
use App\Models\Trip;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PackageChainOfCustodyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_qr_scan_and_manifest_reconciliation_are_idempotent(): void
    {
        $driver = User::query()->where('role', 'driver')->firstOrFail();
        $trip = Trip::query()->where('driver_id', $driver->driver?->id)->firstOrFail();
        $token = $this->tokenFor($driver);
        [$first, $firstQr] = $this->registerPackage($driver, $trip);
        [$second, $secondQr] = $this->registerPackage($driver, $trip);

        $this->withToken($token)->postJson('/api/v1/driver/manifests', [
            'trip_id' => $trip->id,
            'package_ids' => [$first->id, $second->id],
        ])->assertCreated()->assertJsonPath('data.expected_count', 2);

        $manifestId = $this->getJson('/api/v1/driver/manifests/' . PackageManifest::query()->latest('id')->value('id'), [
            'Authorization' => 'Bearer ' . $token,
        ])->assertOk()->json('data.id');
        $manifest = PackageManifest::query()->findOrFail($manifestId);

        $this->withToken($token)->postJson('/api/v1/driver/manifests/' . $manifest->id . '/scan', ['qr_token' => $firstQr])
            ->assertOk()->assertJsonPath('data.scanned_count', 1);
        $this->withToken($token)->postJson('/api/v1/driver/manifests/' . $manifest->id . '/scan', ['qr_token' => $firstQr])
            ->assertOk()->assertJsonPath('data.scanned_count', 1);
        $this->withToken($token)->postJson('/api/v1/driver/manifests/' . $manifest->id . '/reconcile')
            ->assertStatus(422)->assertJsonValidationErrors(['manifest']);

        $this->withToken($token)->postJson('/api/v1/driver/manifests/' . $manifest->id . '/scan', ['qr_token' => $secondQr])
            ->assertOk()->assertJsonPath('data.scanned_count', 2);
        $this->withToken($token)->postJson('/api/v1/driver/manifests/' . $manifest->id . '/reconcile')
            ->assertOk()->assertJsonPath('data.status', 'reconciled');

        $this->assertDatabaseHas('package_events', ['package_id' => $first->id, 'status' => 'manifest_scanned']);
        $this->assertDatabaseHas('package_events', ['package_id' => $second->id, 'status' => 'manifest_reconciled']);
    }

    public function test_transfer_requires_recipient_acceptance_and_accept_retry_is_idempotent(): void
    {
        $fromUser = User::query()->where('role', 'driver')->firstOrFail();
        $fromDriver = $fromUser->driver;
        $toUser = User::factory()->create(['role' => 'driver', 'active' => true]);
        $toUser->roles()->sync([Role::query()->where('name', 'driver')->value('id')]);
        $toDriver = Driver::query()->create([
            'user_id' => $toUser->id,
            'name' => 'Receiving Driver',
            'license_number' => 'D-CHAIN-' . Str::upper(Str::random(8)),
            'status' => 'active',
        ]);
        $trip = Trip::query()->where('driver_id', $fromDriver->id)->firstOrFail();
        [$package] = $this->registerPackage($fromUser, $trip);
        $fromToken = $this->tokenFor($fromUser);
        $toToken = $this->tokenFor($toUser);
        $this->assertSame($toDriver->id, $toUser->fresh()->driver?->id);

        $transfer = $this->withToken($fromToken)->postJson('/api/v1/driver/packages/' . $package->id . '/transfer', [
            'to_driver_id' => $toDriver->id,
            'notes' => 'Vehicle handoff at terminal',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');

        $transferId = $transfer->json('data.id');
        $this->assertSame((int) $toDriver->id, (int) $transfer->json('data.to_driver_id'));
        $this->withToken($fromToken)->postJson('/api/v1/driver/package-transfers/' . $transferId . '/accept')->assertForbidden();
        $accept = $this->withToken($toToken)->postJson('/api/v1/driver/package-transfers/' . $transferId . '/accept');
        $accept->assertOk()->assertJsonPath('data.status', 'accepted');
        $this->withToken($toToken)->postJson('/api/v1/driver/package-transfers/' . $transferId . '/accept')
            ->assertOk()->assertJsonPath('data.status', 'accepted');

        $this->assertDatabaseHas('packages', ['id' => $package->id, 'driver_id' => $toDriver->id, 'status' => 'in_progress']);
        $this->assertDatabaseHas('package_events', ['package_id' => $package->id, 'status' => 'transfer_accepted']);
    }

    private function registerPackage(User $driver, Trip $trip): array
    {
        $response = $this->withToken($this->tokenFor($driver))->postJson('/api/v1/driver/packages', [
            'trip_id' => $trip->id,
            'sender_name' => 'Chain sender',
            'recipient_name' => 'Chain recipient',
            'description' => 'Chain of custody test package',
        ])->assertCreated();
        $package = TransportPackage::query()->findOrFail($response->json('data.package.id'));
        return [$package, $response->json('data.qr_payload.token')];
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(80);
        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'package-chain-test',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addHour(),
        ]);
        return $plain;
    }
}
