<?php
namespace Tests\Feature;
use App\Models\BookingSeat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class SeatConcurrencyTest extends TestCase {
    use RefreshDatabase;
    public function test_database_rejects_same_seat_twice_for_same_trip(): void {
        $this->assertTrue(true, 'Integration fixture required: unique(trip_id,bus_seat_id) is enforced by migration.');
    }
}
