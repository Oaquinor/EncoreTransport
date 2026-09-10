<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\TransportRoute;
use App\Models\Trip;
use Illuminate\Database\Seeder;

class EncoreTransportSeeder extends Seeder
{
    public function run(): void
    {
        $route = TransportRoute::query()->create(['origin' => 'Boston', 'destination' => 'New York', 'distance_km' => 346, 'active' => true]);
        $bus = Bus::query()->create(['code' => 'BUS-001', 'plate' => 'ET-314-AX', 'capacity' => 42, 'status' => 'operational']);
        $driver = Driver::query()->create(['name' => 'Jordan Miles', 'license_number' => 'D-AL-5520', 'status' => 'upcoming']);
        $trip = Trip::query()->create([
            'transport_route_id' => $route->id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'departure_date' => now()->addDays(3)->toDateString(),
            'departure_time' => '07:00:00',
            'arrival_time' => '10:15:00',
            'status' => 'boarding',
            'available_seats' => 34,
            'price_per_passenger' => 85,
            'seat_map' => []
        ]);

        Booking::query()->create([
            'trip_id' => $trip->id,
            'passenger_name' => 'Jordan Taylor',
            'passenger_email' => 'jordan.taylor@email.com',
            'passenger_phone' => '+1 (617) 555-0148',
            'seat_numbers' => ['4B', '4C'],
            'status' => 'confirmed',
            'total_amount' => 170
        ]);
    }
}