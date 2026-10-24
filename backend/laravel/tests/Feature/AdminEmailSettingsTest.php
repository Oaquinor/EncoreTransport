<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminEmailSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_admin_can_update_sender_email_and_passenger_cannot(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();

        $this->withToken($this->tokenFor($admin))
            ->putJson('/api/v1/admin/settings/email', [
                'mail_from_address' => 'tickets@example.test',
                'mail_from_name' => 'Encore Tickets',
            ])
            ->assertOk()
            ->assertJsonPath('data.mail_from_address', 'tickets@example.test')
            ->assertJsonPath('data.mail_from_name', 'Encore Tickets');

        $this->withToken($this->tokenFor($passenger))
            ->putJson('/api/v1/admin/settings/email', [
                'mail_from_address' => 'attacker@example.test',
                'mail_from_name' => 'Attacker',
            ])
            ->assertForbidden();
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(64);
        ApiToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plain),
            'name' => 'settings-test',
            'expires_at' => now()->addHour(),
        ]);
        return $plain;
    }
}
