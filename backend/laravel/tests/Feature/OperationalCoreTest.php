<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Booking;
use App\Models\BookingSeat;
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
        $this->getJson('/api/v1/trips/search?origin=Boston&destination=New%20York&passengers=1')
            ->assertOk()->assertJsonPath('data.0.id',$trip->id);
        $this->getJson('/api/v1/trips/'.$trip->id.'/seats')
            ->assertOk()->assertJsonCount(42,'data');
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
