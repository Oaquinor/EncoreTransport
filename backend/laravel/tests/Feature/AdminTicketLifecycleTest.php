<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\Trip;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminTicketLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_admin_distinguishes_ticket_reservation_payment_and_boarding_states(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $trip = Trip::query()->where('status', 'scheduled')->firstOrFail();
        $booking = Booking::query()->create([
            'public_id' => (string) Str::uuid(), 'user_id' => $passenger->id, 'reference' => 'TICKET-LIFECYCLE-QA', 'trip_id' => $trip->id,
            'passenger_name' => $passenger->name, 'passenger_email' => $passenger->email, 'passenger_phone' => $passenger->phone ?? '', 'seat_numbers' => [], 'status' => 'confirmed', 'confirmed_at' => now(), 'total_amount' => 8500,
        ]);
        Payment::query()->create(['public_id' => (string) Str::uuid(), 'booking_id' => $booking->id, 'idempotency_key' => 'ticket-lifecycle-qa', 'gateway' => 'test', 'status' => 'paid', 'amount_minor' => 8500, 'currency' => 'DOP', 'verified_at' => now()]);
        $ticket = Ticket::query()->create(['public_id' => (string) Str::uuid(), 'booking_id' => $booking->id, 'status' => 'active', 'qr_payload' => '{}', 'validation_token_hash' => hash('sha256', Str::random(64)), 'issued_at' => now()]);
        $plain = Str::random(80);
        ApiToken::query()->create(['user_id' => $admin->id, 'token_hash' => hash('sha256', $plain), 'last_used_at' => now()]);

        $this->withToken($plain)->getJson('/api/v1/admin/tickets?lifecycle=valid')->assertOk()->assertJsonPath('data.0.boarding_status', 'not_boarded');
        $this->withToken($plain)->postJson('/api/v1/admin/tickets/' . $ticket->id . '/transition', ['status' => 'no_show'])->assertOk()->assertJsonPath('data.status', 'no_show');
        $this->withToken($plain)->getJson('/api/v1/admin/tickets/' . $ticket->id)->assertOk()->assertJsonPath('data.history.0.action', 'ticket.no_show');
        $this->assertDatabaseHas('payments', ['booking_id' => $booking->id, 'status' => 'paid']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'confirmed']);
    }

    public function test_active_ticket_on_a_finished_departure_is_not_used_not_implicitly_boarded(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $trip = Trip::query()->firstOrFail();
        $trip->update(['departure_date' => now()->subDay()->toDateString(), 'departure_time' => '07:00:00', 'status' => 'completed']);
        $booking = Booking::query()->create(['public_id' => (string) Str::uuid(), 'user_id' => $passenger->id, 'reference' => 'TICKET-NOT-USED-QA', 'trip_id' => $trip->id, 'passenger_name' => $passenger->name, 'passenger_email' => $passenger->email, 'passenger_phone' => $passenger->phone ?? '', 'seat_numbers' => [], 'status' => 'confirmed', 'confirmed_at' => now(), 'total_amount' => 1]);
        $ticket = Ticket::query()->create(['public_id' => (string) Str::uuid(), 'booking_id' => $booking->id, 'status' => 'active', 'qr_payload' => '{}', 'validation_token_hash' => hash('sha256', Str::random(64)), 'issued_at' => now()]);
        $plain = Str::random(80);
        ApiToken::query()->create(['user_id' => $admin->id, 'token_hash' => hash('sha256', $plain), 'last_used_at' => now()]);

        $this->withToken($plain)->getJson('/api/v1/admin/tickets?lifecycle=not_used&q=' . $ticket->public_id)
            ->assertOk()->assertJsonPath('data.0.lifecycle_status', 'not_used')->assertJsonPath('data.0.boarding_status', 'not_boarded');
    }

    public function test_admin_can_transition_each_terminal_lifecycle_state_and_filter_it(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $trip = Trip::query()->where('status', 'scheduled')->firstOrFail();
        $plain = Str::random(80);
        ApiToken::query()->create([
            'user_id' => $admin->id,
            'token_hash' => hash('sha256', $plain),
            'last_used_at' => now(),
        ]);

        foreach (['no_show', 'cancelled', 'refunded', 'expired'] as $status) {
            $booking = Booking::query()->create([
                'public_id' => (string) Str::uuid(),
                'user_id' => $passenger->id,
                'reference' => 'TICKET-' . strtoupper($status) . '-' . Str::random(6),
                'trip_id' => $trip->id,
                'passenger_name' => $passenger->name,
                'passenger_email' => $passenger->email,
                'passenger_phone' => $passenger->phone ?? '',
                'seat_numbers' => [],
                'status' => 'confirmed',
                'confirmed_at' => now(),
                'total_amount' => 8500,
            ]);
            Payment::query()->create([
                'public_id' => (string) Str::uuid(),
                'booking_id' => $booking->id,
                'idempotency_key' => 'ticket-' . $status . '-' . Str::random(8),
                'gateway' => 'test',
                'status' => 'paid',
                'amount_minor' => 8500,
                'currency' => 'DOP',
                'verified_at' => now(),
            ]);
            $ticket = Ticket::query()->create([
                'public_id' => (string) Str::uuid(),
                'booking_id' => $booking->id,
                'status' => 'active',
                'qr_payload' => '{}',
                'validation_token_hash' => hash('sha256', Str::random(64)),
                'issued_at' => now(),
            ]);

            if ($status === 'expired') {
                $trip->forceFill([
                    'departure_date' => now()->subDay()->toDateString(),
                    'departure_time' => '07:00:00',
                ])->save();
            }

            $this->withToken($plain)
                ->postJson('/api/v1/admin/tickets/' . $ticket->id . '/transition', ['status' => $status])
                ->assertOk()
                ->assertJsonPath('data.status', $status)
                ->assertJsonPath('data.lifecycle_status', $status);

            $this->withToken($plain)
                ->getJson('/api/v1/admin/tickets?lifecycle=' . $status . '&q=' . $ticket->public_id)
                ->assertOk()
                ->assertJsonPath('data.0.status', $status)
                ->assertJsonPath('data.0.lifecycle_status', $status);

            $this->withToken($plain)
                ->getJson('/api/v1/admin/tickets/' . $ticket->id)
                ->assertOk()
                ->assertJsonPath('data.history.0.action', 'ticket.' . $status);

            $this->assertDatabaseHas('tickets', ['id' => $ticket->id, 'status' => $status]);
            $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'confirmed']);
            $this->assertDatabaseHas('payments', [
                'booking_id' => $booking->id,
                'status' => $status === 'refunded' ? 'refunded' : 'paid',
            ]);
        }
    }
}
