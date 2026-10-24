<?php
namespace Tests\Feature;
use App\Models\BookingSeat;
use App\Models\BusSeat;
use App\Models\Trip;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class SeatConcurrencyTest extends TestCase {
    use RefreshDatabase;
    public function test_same_seat_can_be_reserved_on_non_overlapping_segments_but_not_overlapping_segments(): void {
        $this->seed(EncoreTransportDemoSeeder::class);
        $trip = Trip::query()->firstOrFail();
        $seat = BusSeat::query()->where('bus_id', $trip->bus_id)->firstOrFail();
        $first = BookingSeat::query()->create([
            'booking_id' => $trip->bookings()->create(['public_id' => (string) \Illuminate\Support\Str::uuid(), 'reference' => 'ET-TEST-1', 'passenger_name' => 'A', 'passenger_email' => 'a@example.test', 'passenger_phone' => '', 'seat_numbers' => [], 'total_amount' => 0, 'status' => 'pending_payment'])->id,
            'trip_id' => $trip->id, 'bus_seat_id' => $seat->id, 'origin_stop_sequence' => 1,
            'destination_stop_sequence' => 2, 'status' => 'held', 'held_until' => now()->addMinutes(10),
        ]);
        $this->assertDatabaseHas('booking_seats', ['id' => $first->id]);
        $second = BookingSeat::query()->create([
            'booking_id' => $trip->bookings()->create(['public_id' => (string) \Illuminate\Support\Str::uuid(), 'reference' => 'ET-TEST-2', 'passenger_name' => 'B', 'passenger_email' => 'b@example.test', 'passenger_phone' => '', 'seat_numbers' => [], 'total_amount' => 0, 'status' => 'pending_payment'])->id,
            'trip_id' => $trip->id, 'bus_seat_id' => $seat->id, 'origin_stop_sequence' => 2,
            'destination_stop_sequence' => 3, 'status' => 'held', 'held_until' => now()->addMinutes(10),
        ]);
        $this->assertDatabaseHas('booking_seats', ['id' => $second->id]);
        $this->assertSame(1, BookingSeat::query()->where('trip_id', $trip->id)->where('bus_seat_id', $seat->id)
            ->where('origin_stop_sequence', '<', 2)->where('destination_stop_sequence', '>', 1)->count());
    }
}
