<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingSeat;
use App\Models\BusSeat;
use App\Models\Trip;
use App\Models\User;
use Database\Seeders\EncoreTransportSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SeatConstraintTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_rejects_same_seat_twice_for_same_trip(): void
    {
        $this->seed(EncoreTransportSeeder::class);

        $trip = Trip::query()->firstOrFail();
        $seat = BusSeat::query()->where('bus_id', $trip->bus_id)->firstOrFail();
        $user = User::query()->where('role', 'passenger')->firstOrFail();

        $bookingA = $this->makeBooking($trip, $user, 'ET-CONCURRENCY-A');
        $bookingB = $this->makeBooking($trip, $user, 'ET-CONCURRENCY-B');

        BookingSeat::query()->create([
            'booking_id' => $bookingA->id,
            'trip_id' => $trip->id,
            'bus_seat_id' => $seat->id,
            'status' => 'held',
            'held_until' => now()->addMinutes(15),
        ]);

        $this->expectException(QueryException::class);

        BookingSeat::query()->create([
            'booking_id' => $bookingB->id,
            'trip_id' => $trip->id,
            'bus_seat_id' => $seat->id,
            'status' => 'held',
            'held_until' => now()->addMinutes(15),
        ]);
    }

    private function makeBooking(Trip $trip, User $user, string $reference): Booking
    {
        return Booking::query()->create([
            'public_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'reference' => $reference,
            'trip_id' => $trip->id,
            'passenger_name' => $user->name,
            'passenger_email' => $user->email,
            'passenger_phone' => '',
            'seat_numbers' => [],
            'status' => 'pending_payment',
            'expires_at' => now()->addMinutes(15),
            'total_amount' => 0,
        ]);
    }
}
