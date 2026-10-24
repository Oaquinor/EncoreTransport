<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Booking;
use App\Models\BookingSeat;
use App\Models\Bus;
use App\Models\BusSeat;
use App\Models\Trip;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OperationalCoreTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_trip_search_and_seats_use_database_data(): void
    {
        $trip=Trip::query()->firstOrFail();
        $this->getJson('/api/v1/trips/search?origin=Georgetown&destination=New%20Amsterdam&passengers=1')
            ->assertOk()->assertJsonPath('data.0.id',$trip->id);
        $this->getJson('/api/v1/trips/'.$trip->id.'/seats')
            ->assertOk()->assertJsonCount(55,'data');
    }

    public function test_admin_can_create_edit_and_cancel_a_scheduled_trip(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $trip = Trip::query()->firstOrFail();
        $token = $this->tokenFor($admin);
        $payload = [
            'transport_route_id' => $trip->transport_route_id,
            'bus_id' => $trip->bus_id,
            'driver_id' => $trip->driver_id,
            'departure_date' => now()->addDays(5)->toDateString(),
            'departure_time' => '09:00',
            'arrival_time' => '12:00',
            'price_per_passenger' => 90,
        ];

        $created = $this->withToken($token)
            ->postJson('/api/v1/admin/trips', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'scheduled')
            ->assertJsonPath('data.availableSeats', 55);
        $tripId = $created->json('data.id');

        $this->withToken($token)
            ->putJson('/api/v1/admin/trips/'.$tripId, array_merge($payload, ['price_per_passenger' => 95]))
            ->assertOk()
            ->assertJsonPath('data.baseFare', 95);

        $this->withToken($token)
            ->postJson('/api/v1/admin/trips/'.$tripId.'/cancel')
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_booking_holds_real_seats_and_prevents_duplicate(): void
    {
        $trip=Trip::query()->firstOrFail();
        $seatIds=$trip->bus->seats()->limit(1)->pluck('id')->all();
        $user=User::query()->where('email','passenger@example.test')->firstOrFail();
        $token=$this->tokenFor($user);
        $payload=['trip_id'=>$trip->id,'seat_ids'=>$seatIds,'passengers'=>[['full_name'=>'Test Passenger','email'=>'passenger@example.test']]];

        $this->withToken($token)->postJson('/api/v1/bookings',$payload)->assertCreated();
        $this->assertDatabaseHas('booking_seats',['trip_id'=>$trip->id,'bus_seat_id'=>$seatIds[0],'status'=>'held']);
        $this->withToken($token)->postJson('/api/v1/bookings',$payload)->assertStatus(422);
    }

    public function test_guest_can_create_and_retrieve_booking_with_private_access_token(): void
    {
        $trip = Trip::query()->firstOrFail();
        $seat = $trip->bus->seats()->firstOrFail();
        $response = $this->postJson('/api/v1/bookings', [
            'trip_id' => $trip->id,
            'seat_ids' => [$seat->id],
            'passengers' => [[
                'full_name' => 'Guest Passenger',
                'email' => 'guest@example.test',
                'phone' => '+5926000000',
            ]],
        ])->assertCreated();

        $guestToken = (string) $response->json('guest_access_token');
        $bookingId = $response->json('data.id');

        $this->assertNotSame('', $guestToken);
        $this->assertArrayNotHasKey('guest_access_token_hash', $response->json('data'));
        $this->getJson('/api/v1/bookings/'.$bookingId)->assertForbidden();
        $this->withHeader('X-Guest-Booking-Token', $guestToken)
            ->getJson('/api/v1/bookings/'.$bookingId)
            ->assertOk()
            ->assertJsonPath('data.id', $bookingId);
    }

    public function test_same_seat_can_be_reused_only_on_non_overlapping_segments(): void
    {
        $trip=Trip::query()->firstOrFail();
        $seat=$trip->bus->seats()->firstOrFail();
        $user=User::query()->where('email','passenger@example.test')->firstOrFail();
        $token=$this->tokenFor($user);
        $base=['trip_id'=>$trip->id,'seat_ids'=>[$seat->id],'passengers'=>[['full_name'=>'Segment Passenger']]];
        $this->withToken($token)->postJson('/api/v1/bookings',$base+['origin'=>'Georgetown','destination'=>'Rosignol'])->assertCreated();
        $this->withToken($token)->postJson('/api/v1/bookings',$base+['origin'=>'Rosignol','destination'=>'New Amsterdam'])->assertCreated();
        $this->getJson('/api/v1/trips/search?origin=Georgetown&destination=Rosignol')
            ->assertOk()->assertJsonPath('data.0.availableSeats', 54)
            ->assertJsonPath('data.0.origin', 'Georgetown')->assertJsonPath('data.0.destination', 'Rosignol')
            ->assertJsonPath('data.0.baseFare', 40);
        $this->getJson('/api/v1/trips/search?origin=Rosignol&destination=New%20Amsterdam')
            ->assertOk()->assertJsonPath('data.0.availableSeats', 54)->assertJsonPath('data.0.baseFare', 45);
        $this->getJson('/api/v1/trips/search?origin=Georgetown&destination=New%20Amsterdam')
            ->assertOk()->assertJsonPath('data.0.availableSeats', 54);
        $this->getJson('/api/v1/trips/'.$trip->id.'/quote?passengers=1&origin=Georgetown&destination=Rosignol')
            ->assertOk()->assertJsonPath('data.base_fare', 40);
        $this->getJson('/api/v1/trips/'.$trip->id.'/quote?passengers=1&origin=Rosignol&destination=New%20Amsterdam')
            ->assertOk()->assertJsonPath('data.base_fare', 45);
        $this->withToken($token)->postJson('/api/v1/bookings',$base+['origin'=>'Georgetown','destination'=>'New Amsterdam'])->assertStatus(422);
    }

    public function test_blocked_seats_are_not_available_or_bookable(): void
    {
        $trip = Trip::query()->firstOrFail();
        $seat = $trip->bus->seats()->firstOrFail();
        $seat->forceFill(['blocked' => true])->save();
        $trip->forceFill(['available_seats' => 55])->save();
        $user = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $token = $this->tokenFor($user);

        $this->getJson('/api/v1/trips/'.$trip->id.'/seats')
            ->assertOk()->assertJsonFragment(['id' => $seat->id, 'blocked' => true, 'available' => false]);
        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 55]);
        $this->withToken($token)->postJson('/api/v1/bookings', [
            'trip_id' => $trip->id,
            'seat_ids' => [$seat->id],
            'passengers' => [['full_name' => 'Blocked Seat Passenger']],
        ])->assertUnprocessable();
        $this->assertDatabaseMissing('booking_seats', ['trip_id' => $trip->id, 'bus_seat_id' => $seat->id]);
    }

    public function test_search_calculates_availability_for_each_bus_not_stale_trip_counter(): void
    {
        $firstTrip = Trip::query()->firstOrFail();
        $firstTrip->forceFill(['available_seats' => 1])->save();
        $bus = Bus::query()->create(['code' => 'BUS-002', 'plate' => 'ET-002', 'capacity' => 2, 'status' => 'operational']);
        foreach (['1', '2'] as $number) {
            BusSeat::query()->create(['bus_id' => $bus->id, 'seat_number' => $number, 'active' => true, 'blocked' => false]);
        }
        $secondTrip = Trip::query()->create([
            'transport_route_id' => $firstTrip->transport_route_id,
            'bus_id' => $bus->id,
            'driver_id' => $firstTrip->driver_id,
            'departure_date' => $firstTrip->departure_date,
            'departure_time' => '08:00:00',
            'arrival_time' => '11:15:00',
            'status' => 'scheduled',
            'available_seats' => 0,
            'price_per_passenger' => 85,
        ]);

        $response = $this->getJson('/api/v1/trips/search?origin=Georgetown&destination=New%20Amsterdam&per_page=10')->assertOk();
        $this->assertSame(55, collect($response->json('data'))->firstWhere('id', $firstTrip->id)['availableSeats']);
        $this->assertSame(2, collect($response->json('data'))->firstWhere('id', $secondTrip->id)['availableSeats']);
        $this->assertDatabaseHas('trips', ['id' => $firstTrip->id, 'available_seats' => 1]);
        $this->assertDatabaseHas('trips', ['id' => $secondTrip->id, 'available_seats' => 0]);
    }

    public function test_cancelling_a_hold_releases_its_seat_for_the_same_segment(): void
    {
        $trip = Trip::query()->firstOrFail();
        $seat = $trip->bus->seats()->firstOrFail();
        $user = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $token = $this->tokenFor($user);
        $booking = $this->withToken($token)->postJson('/api/v1/bookings', [
            'trip_id' => $trip->id,
            'seat_ids' => [$seat->id],
            'passengers' => [['full_name' => 'Cancel Passenger']],
        ])->assertCreated()->json('data.id');

        $this->withToken($token)->postJson('/api/v1/bookings/'.$booking.'/cancel')->assertOk();
        $this->getJson('/api/v1/trips/'.$trip->id.'/seats')->assertOk()
            ->assertJsonFragment(['id' => $seat->id, 'available' => true]);
    }

    public function test_unconfigured_payment_gateway_fails_explicitly_instead_of_simulating_success(): void
    {
        $trip=Trip::query()->firstOrFail();
        $seat=$trip->bus->seats()->firstOrFail();
        $user=User::query()->where('email','passenger@example.test')->firstOrFail();
        $token=$this->tokenFor($user);
        $bookingResponse=$this->withToken($token)->postJson('/api/v1/bookings',[
            'trip_id'=>$trip->id,'seat_ids'=>[$seat->id],'passengers'=>[['full_name'=>'Test Passenger']],
        ])->assertCreated();
        $bookingId=$bookingResponse->json('data.id');

        $this->withToken($token)->postJson('/api/v1/bookings/'.$bookingId.'/payments',[
            'idempotency_key'=>(string)Str::uuid(),
        ])->assertStatus(503)->assertJsonPath('message','Payment gateway is not configured.');
    }

    public function test_expired_booking_releases_held_seat(): void
    {
        $trip=Trip::query()->firstOrFail();
        $seat=$trip->bus->seats()->firstOrFail();
        $user=User::query()->where('email','passenger@example.test')->firstOrFail();
        $token=$this->tokenFor($user);
        $response=$this->withToken($token)->postJson('/api/v1/bookings',[
            'trip_id'=>$trip->id,'seat_ids'=>[$seat->id],'passengers'=>[['full_name'=>'Test Passenger']],
        ])->assertCreated();
        $booking=Booking::query()->findOrFail($response->json('data.id'));
        $booking->forceFill(['expires_at'=>now()->subMinute()])->save();
        BookingSeat::query()->where('booking_id',$booking->id)->update(['held_until'=>now()->subMinute()]);

        $this->artisan('schedule:run');
        $this->getJson('/api/v1/trips/'.$trip->id.'/seats')->assertOk()->assertJsonFragment(['id'=>$seat->id,'available'=>true]);
    }

    private function tokenFor(User $user): string
    {
        $plain=Str::random(80);
        ApiToken::query()->create(['user_id'=>$user->id,'name'=>'test','token_hash'=>hash('sha256',$plain),'expires_at'=>now()->addHour()]);
        return $plain;
    }
}
