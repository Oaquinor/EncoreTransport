<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Driver;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ProfileAvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
        Storage::fake('public');
    }

    public function test_authenticated_driver_profile_exposes_its_uploaded_photo_as_avatar_url(): void
    {
        $driver = Driver::query()->firstOrFail();
        $driver->update(['photo_path' => 'drivers/profile.webp']);

        $this->withToken($this->tokenFor($driver->user()->firstOrFail()))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.avatar_url', Storage::disk('public')->url('drivers/profile.webp'));
    }

    public function test_profiles_without_a_photo_return_null_avatar_url(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();

        $this->withToken($this->tokenFor($admin))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.avatar_url', null);
    }

    public function test_authenticated_user_can_upload_a_profile_photo(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();

        $response = $this->withToken($this->tokenFor($admin))
            ->postJson('/api/v1/auth/profile/photo', ['photo' => UploadedFile::fake()->image('profile.png')])
            ->assertOk()
            ->assertJsonPath('data.user.name', 'Admin Demo');

        $path = $admin->fresh()->profile_photo_path;
        $this->assertNotEmpty($path);
        Storage::disk('public')->assertExists($path);
        $this->assertSame(Storage::disk('public')->url($path), $response->json('data.user.avatar_url'));
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(80);
        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'profile-avatar-test',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addHour(),
        ]);

        return $plain;
    }
}
