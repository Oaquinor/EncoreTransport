<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_admin_reports_cover_operational_records_with_period_filters(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $token = $this->tokenFor($admin);
        $period = http_build_query([
            'from' => now()->subDays(30)->toDateString(),
            'to' => now()->addDays(30)->toDateString(),
        ]);

        $this->withToken($token)->getJson('/api/v1/admin/reports/bookings?'.$period)
            ->assertOk()
            ->assertJsonPath('data.items.0.reference', 'ET-DEMO-BOOKING')
            ->assertJsonStructure(['data' => ['period' => ['from', 'to'], 'items' => [['passenger_count', 'seats', 'payment_status']]]]);

        foreach (['revenue', 'incidents', 'packages', 'schedules'] as $report) {
            $this->withToken($token)->getJson('/api/v1/admin/reports/'.$report.'?'.$period)
                ->assertOk()
                ->assertJsonStructure(['data' => ['period' => ['from', 'to'], 'items']]);
        }
    }

    public function test_report_date_range_rejects_an_end_before_the_start(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $this->withToken($this->tokenFor($admin))
            ->getJson('/api/v1/admin/reports/bookings?from=2026-10-20&to=2026-10-19')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('to');
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(80);
        ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'admin-report-test',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addHour(),
        ]);

        return $plain;
    }
}
