<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\TransportPackage;
use App\Models\Trip;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class PackageCustodyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_package_status_transitions_are_validated_and_delivery_requires_private_evidence(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $driver = User::query()->where('role', 'driver')->firstOrFail();
        $package = $this->registerPackage($driver);
        $token = $this->tokenFor($driver);
        $endpoint = '/api/v1/driver/packages/' . $package->id . '/status';

        $this->withToken($token)
            ->postJson($endpoint, ['status' => 'delivered'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->assertDatabaseHas('packages', ['id' => $package->id, 'status' => 'received']);
        $this->assertDatabaseCount('package_events', 1);

        $this->withToken($token)
            ->postJson($endpoint, ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->withToken($token)
            ->postJson($endpoint, ['status' => 'received'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->withToken($token)
            ->post($endpoint, [
                'status' => 'delivered',
                'recipient_verified' => '1',
                'delivery_photo' => UploadedFile::fake()->image('delivery.jpg'),
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');

        $saved = TransportPackage::query()->findOrFail($package->id);
        $this->assertNotNull($saved->recipient_verified_at);
        $this->assertNotNull($saved->delivered_at);
        $this->assertNotNull($saved->delivery_photo_path);
        Storage::disk('local')->assertExists($saved->delivery_photo_path);
        Storage::disk('public')->assertMissing($saved->delivery_photo_path);
        $this->assertDatabaseCount('package_events', 3);
    }

    public function test_retries_are_idempotent_and_driver_authorization_is_enforced(): void
    {
        $driver = User::query()->where('role', 'driver')->firstOrFail();
        $passenger = User::query()->where('role', 'passenger')->firstOrFail();
        $package = $this->registerPackage($driver);
        $driverToken = $this->tokenFor($driver);
        $endpoint = '/api/v1/driver/packages/' . $package->id . '/status';

        $this->withToken($driverToken)->postJson($endpoint, ['status' => 'in_progress'])->assertOk();
        $this->withToken($driverToken)->postJson($endpoint, ['status' => 'in_progress'])->assertOk();
        $this->assertDatabaseCount('package_events', 2);

        $this->withToken($this->tokenFor($passenger))
            ->postJson($endpoint, ['status' => 'delivered'])
            ->assertForbidden();
    }

    public function test_delivery_photo_is_removed_when_package_persistence_fails(): void
    {
        Storage::fake('local');

        $driver = User::query()->where('role', 'driver')->firstOrFail();
        $package = $this->registerPackage($driver);
        $token = $this->tokenFor($driver);
        $endpoint = '/api/v1/driver/packages/' . $package->id . '/status';

        $this->withToken($token)
            ->postJson($endpoint, ['status' => 'in_progress'])
            ->assertOk();

        TransportPackage::saving(function (TransportPackage $model): void {
            if ($model->isDirty('status') && $model->status === 'delivered') {
                throw new \RuntimeException('Forced package persistence failure.');
            }
        });

        $this->withoutExceptionHandling();

        try {
            $this->withToken($token)->post($endpoint, [
                'status' => 'delivered',
                'recipient_verified' => '1',
                'delivery_photo' => UploadedFile::fake()->image('delivery-failure.jpg'),
            ]);
            $this->fail('The forced persistence failure should have escaped the request.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Forced package persistence failure.', $exception->getMessage());
        } finally {
            TransportPackage::flushEventListeners();
        }

        $this->assertDatabaseHas('packages', [
            'id' => $package->id,
            'status' => 'in_progress',
            'delivery_photo_path' => null,
        ]);
        $this->assertDatabaseCount('package_events', 2);
        $this->assertSame([], Storage::disk('local')->allFiles('package-deliveries'));
    }

    public function test_public_tracking_is_private_and_email_does_not_auto_link_a_recipient_account(): void
    {
        $driver = User::query()->where('role', 'driver')->firstOrFail();
        $passenger = User::query()->where('role', 'passenger')->firstOrFail();
        $notificationCount = DB::table('user_notifications')->where('user_id', $passenger->id)->count();
        $package = $this->registerPackage($driver, [
            'recipient_email' => $passenger->email,
            'recipient_phone' => '+18095551234',
        ]);

        $tracking = $this->getJson('/api/v1/packages/track/' . $package->tracking_token)
            ->assertOk()
            ->assertJsonPath('data.status', 'received')
            ->assertJsonPath('data.next_action', 'Awaiting loading or departure confirmation.')
            ->assertJsonStructure(['data' => ['reference', 'last_updated_at', 'events']]);

        $tracking->assertJsonMissing(['recipient_email' => $passenger->email]);
        $tracking->assertJsonMissing(['recipient_phone' => '+18095551234']);
        $this->assertSame($notificationCount, DB::table('user_notifications')->where('user_id', $passenger->id)->count());
    }

    private function registerPackage(User $driver, array $overrides = []): TransportPackage
    {
        $trip = Trip::query()->where('driver_id', $driver->driver?->id)->firstOrFail();
        $response = $this->withToken($this->tokenFor($driver))->postJson('/api/v1/driver/packages', [
            'trip_id' => $trip->id,
            'sender_name' => 'Sender Test',
            'recipient_name' => 'Recipient Test',
            'description' => 'Custody test package',
            ...$overrides,
        ])->assertCreated();

        $package = TransportPackage::query()->findOrFail($response->json('data.package.id'));
        $package->setAttribute('tracking_token', $response->json('data.tracking_token'));
        return $package;
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(80);
        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'package-custody-test',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addHour(),
        ]);

        return $plain;
    }
}
