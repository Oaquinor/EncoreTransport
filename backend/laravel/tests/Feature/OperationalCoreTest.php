<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Booking;
use App\Models\BookingSeat;
use App\Models\Bus;
use App\Models\BusSeat;
use App\Models\Driver;
use App\Models\Incident;
use App\Models\Payment;
use App\Models\Trip;
use App\Models\User;
use App\Services\Bookings\SeatAvailabilityService;
use App\Services\Payments\PaymentGatewayInterface;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    public function test_admin_trip_assignments_reject_bus_driver_and_overnight_conflicts(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $token = $this->tokenFor($admin);
        $template = Trip::query()->firstOrFail();
        $route = $template->transport_route_id;
        $baseDate = now()->addDays(12)->toDateString();
        $otherDriver = Driver::query()->create(['name' => 'Second Driver', 'license_number' => 'D-TEST-SECOND', 'status' => 'active']);
        $otherBus = Bus::query()->create(['code' => 'BUS-TEST-SECOND', 'plate' => 'ET-TEST-002', 'capacity' => 1, 'status' => 'operational']);
        BusSeat::query()->create(['bus_id' => $otherBus->id, 'seat_number' => '1', 'active' => true, 'blocked' => false]);

        $overnight = [
            'transport_route_id' => $route,
            'bus_id' => $template->bus_id,
            'driver_id' => $template->driver_id,
            'departure_date' => $baseDate,
            'departure_time' => '23:00',
            'arrival_time' => '01:00',
            'price_per_passenger' => 80,
        ];
        $created = $this->withToken($token)->postJson('/api/v1/admin/trips', $overnight)->assertCreated();

        $this->withToken($token)->postJson('/api/v1/admin/trips', [...$overnight,
            'bus_id' => $template->bus_id,
            'driver_id' => $otherDriver->id,
            'departure_time' => '23:30',
            'arrival_time' => '00:30',
        ])->assertUnprocessable()->assertJsonValidationErrors(['bus_id']);

        $this->withToken($token)->postJson('/api/v1/admin/trips', [...$overnight,
            'bus_id' => $otherBus->id,
            'departure_date' => now()->addDays(13)->toDateString(),
            'driver_id' => $template->driver_id,
            'departure_time' => '00:30',
            'arrival_time' => '02:00',
        ])->assertUnprocessable()->assertJsonValidationErrors(['driver_id']);

        $this->withToken($token)->postJson('/api/v1/admin/trips', [...$overnight,
            'bus_id' => $template->bus_id,
            'driver_id' => $otherDriver->id,
            'departure_date' => now()->addDays(13)->toDateString(),
            'departure_time' => '01:00',
            'arrival_time' => '02:00',
        ])->assertCreated();

        $independent = $this->withToken($token)->postJson('/api/v1/admin/trips', [...$overnight,
            'bus_id' => $otherBus->id,
            'driver_id' => $otherDriver->id,
            'departure_time' => '08:00',
            'arrival_time' => '09:00',
        ])->assertCreated()->json('data.id');
        $this->withToken($token)->putJson('/api/v1/admin/trips/'.$independent, [...$overnight,
            'departure_time' => '23:30',
            'arrival_time' => '00:30',
        ])->assertUnprocessable()->assertJsonValidationErrors(['bus_id']);
        $this->assertSame('23:00', $created->json('data.departureTime'));
    }

    public function test_admin_can_review_incident_status_severity_and_resolution_timestamp(): void
    {
        $trip = Trip::query()->firstOrFail();
        $driverUser = $trip->driver?->user;
        $this->assertNotNull($driverUser);

        $created = $this->withToken($this->tokenFor($driverUser))
            ->postJson('/api/v1/driver/incidents', [
                'trip_id' => $trip->id,
                'title' => 'Route condition report',
                'description' => 'A loose sign was reported near the stop.',
                'severity' => 'low',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'open');

        $incidentId = $created->json('data.id');
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $adminToken = $this->tokenFor($admin);

        $this->withToken($adminToken)->getJson('/api/v1/admin/incidents')
            ->assertOk()->assertJsonPath('data.0.id', $incidentId);

        foreach (['in_progress', 'resolved', 'dismissed', 'open'] as $status) {
            $response = $this->withToken($adminToken)
                ->patchJson('/api/v1/admin/incidents/'.$incidentId, [
                    'status' => $status,
                    'severity' => 'high',
                    'title' => 'Route condition reviewed',
                ])
                ->assertOk()
                ->assertJsonPath('data.status', $status)
                ->assertJsonPath('data.severity', 'high')
                ->assertJsonPath('data.title', 'Route condition reviewed');

            $incident = Incident::query()->findOrFail($incidentId);
            $this->assertSame($status === 'resolved', $incident->resolved_at !== null);
            if ($status === 'resolved') {
                $this->assertNotNull($response->json('data.resolved_at'));
            }
        }
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
        $this->withHeader('X-Guest-Booking-Token', $guestToken)
            ->postJson('/api/v1/bookings/'.$bookingId.'/cancel')
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_multi_passenger_booking_requires_and_holds_one_seat_per_passenger(): void
    {
        $trip = Trip::query()->firstOrFail();
        $seatIds = $trip->bus->seats()->where('active', true)->limit(2)->pluck('id')->all();
        $this->assertCount(2, $seatIds);

        $response = $this->postJson('/api/v1/bookings', [
            'trip_id' => $trip->id,
            'seat_ids' => $seatIds,
            'passengers' => [
                ['full_name' => 'Passenger One'],
                ['full_name' => 'Passenger Two'],
            ],
        ])->assertCreated()
            ->assertJsonCount(2, 'data.passengers')
            ->assertJsonCount(2, 'data.reserved_seats');

        $this->assertDatabaseCount('booking_passengers', 2);
        $this->assertDatabaseCount('booking_seats', 2);
        $this->assertNotEmpty($response->json('guest_access_token'));
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

    public function test_batched_availability_uses_two_queries_for_a_page_of_trips(): void
    {
        $template = Trip::query()->firstOrFail();
        $seat = BusSeat::query()->where('bus_id', $template->bus_id)->where('active', true)->where('blocked', false)->firstOrFail();
        $trips = collect([$template]);

        for ($index = 0; $index < 11; $index++) {
            $trip = Trip::query()->create([
                'transport_route_id' => $template->transport_route_id,
                'bus_id' => $template->bus_id,
                'driver_id' => $template->driver_id,
                'departure_date' => now()->addDays(2 + $index)->toDateString(),
                'departure_time' => '08:00:00',
                'arrival_time' => '11:00:00',
                'status' => 'scheduled',
                'available_seats' => 55,
                'price_per_passenger' => 80,
            ]);
            $booking = $trip->bookings()->create([
                'public_id' => (string) Str::uuid(),
                'reference' => 'ET-AVAILABILITY-'.$index,
                'passenger_name' => 'Availability Fixture',
                'passenger_email' => '',
                'passenger_phone' => '',
                'seat_numbers' => [$seat->seat_number],
                'status' => 'pending_payment',
                'expires_at' => now()->addMinutes(15),
                'total_amount' => 80,
            ]);
            BookingSeat::query()->create([
                'booking_id' => $booking->id,
                'trip_id' => $trip->id,
                'bus_seat_id' => $seat->id,
                'origin_stop_sequence' => 1,
                'destination_stop_sequence' => 2,
                'status' => 'held',
                'held_until' => now()->addMinutes(15),
            ]);
            $trips->push($trip);
        }

        $segments = $trips->mapWithKeys(fn (Trip $trip) => [$trip->id => ['origin_sequence' => 1, 'destination_sequence' => 2]]);
        DB::connection()->flushQueryLog();
        DB::connection()->enableQueryLog();

        $counts = app(SeatAvailabilityService::class)->availableCountsForTrips($trips, $segments->all());
        $availabilityQueries = DB::connection()->getQueryLog();
        DB::connection()->disableQueryLog();

        $this->assertCount(12, $counts);
        $this->assertSame(55, $counts[$template->id]);
        $this->assertSame([54], array_values(array_unique(collect($counts)->except($template->id)->all())));
        $this->assertCount(2, $availabilityQueries, 'A page of trips loads active seats and live reservations in two batched queries.');
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

    public function test_failed_payment_can_be_retried_with_the_same_idempotency_key(): void
    {
        $trip = Trip::query()->firstOrFail();
        $seat = $trip->bus->seats()->firstOrFail();
        $user = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $token = $this->tokenFor($user);
        $bookingId = $this->withToken($token)->postJson('/api/v1/bookings', [
            'trip_id' => $trip->id,
            'seat_ids' => [$seat->id],
            'passengers' => [['full_name' => 'Retry Passenger']],
        ])->assertCreated()->json('data.id');
        $idempotencyKey = (string) Str::uuid();

        $this->withToken($token)->postJson('/api/v1/bookings/'.$bookingId.'/payments', [
            'idempotency_key' => $idempotencyKey,
        ])->assertStatus(503);

        config(['encore.payment_gateway' => 'test']);
        app()->instance(PaymentGatewayInterface::class, new class implements PaymentGatewayInterface {
            public function initiate(Payment $payment, array $context = []): array
            {
                return ['checkout_url' => 'https://payments.example.test/checkout/'.$payment->public_id];
            }

            public function verifyWebhook(array $payload, array $headers = []): array
            {
                return ['valid' => false];
            }
        });

        $this->withToken($token)->postJson('/api/v1/bookings/'.$bookingId.'/payments', [
            'idempotency_key' => $idempotencyKey,
        ])->assertCreated()->assertJsonPath('data.payment.status', 'processing');

        $this->withToken($token)->postJson('/api/v1/bookings/'.$bookingId.'/payments', [
            'idempotency_key' => $idempotencyKey,
        ])->assertCreated()
            ->assertJsonPath('data.idempotent_replay', true)
            ->assertJsonPath('data.gateway.checkout_url', 'https://payments.example.test/checkout/'.Payment::query()->where('booking_id', $bookingId)->value('public_id'))
            ->assertJsonMissingPath('data.payment.metadata')
            ->assertJsonMissingPath('data.payment.idempotency_key');

        $this->withToken($token)->getJson('/api/v1/bookings/'.$bookingId.'/payments')->assertOk()
            ->assertJsonMissingPath('data.0.metadata')
            ->assertJsonMissingPath('data.0.idempotency_key');

        $this->assertSame(1, Payment::query()->where('booking_id', $bookingId)->count());
        $this->assertSame('processing', Payment::query()->where('booking_id', $bookingId)->value('status'));
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
