<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Bus;
use App\Models\BusSeat;
use App\Models\Driver;
use App\Models\TransportRoute;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EncoreTransportSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment(['local', 'testing'])) {
            $this->command?->warn('EncoreTransportSeeder skipped outside local/testing environment.');
            return;
        }

        $passengerUser = User::query()->updateOrCreate(
            ['email' => 'passenger@example.test'],
            [
                'name' => 'Passenger Demo',
                'role' => 'passenger',
                'phone' => '+18095550001',
                'active' => true,
                'password' => Hash::make('password'),
            ]
        );

        $driverUser = User::query()->updateOrCreate(
            ['email' => 'driver@example.test'],
            [
                'name' => 'Driver Demo',
                'role' => 'driver',
                'phone' => '+18095550002',
                'active' => true,
                'password' => Hash::make('password'),
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@example.test'],
            [
                'name' => 'Admin Demo',
                'role' => 'admin',
                'phone' => '+18095550003',
                'active' => true,
                'password' => Hash::make('password'),
            ]
        );

        $route = TransportRoute::query()->updateOrCreate(
            ['origin' => 'Boston', 'destination' => 'New York'],
            ['distance_km' => 346, 'active' => true]
        );

        $bus = Bus::query()->updateOrCreate(
            ['code' => 'BUS-001'],
            ['plate' => 'ET-314-AX', 'capacity' => 42, 'status' => 'operational']
        );

        $driver = Driver::query()->updateOrCreate(
            ['license_number' => 'D-AL-5520'],
            [
                'user_id' => $driverUser->id,
                'name' => 'Driver Demo',
                'status' => 'upcoming',
            ]
        );

        $this->seedBusSeats($bus);

        $trip = Trip::query()->updateOrCreate(
            [
                'transport_route_id' => $route->id,
                'bus_id' => $bus->id,
                'driver_id' => $driver->id,
                'departure_date' => now()->addDays(3)->toDateString(),
                'departure_time' => '07:00:00',
            ],
            [
                'arrival_time' => '10:15:00',
                'status' => 'scheduled',
                'available_seats' => $bus->seats()->where('active', true)->count(),
                'price_per_passenger' => 85,
                'seat_map' => null,
            ]
        );

        Booking::query()->updateOrCreate(
            ['reference' => 'ET-DEMO-BOOKING'],
            [
                'public_id' => (string) Str::uuid(),
                'user_id' => $passengerUser->id,
                'trip_id' => $trip->id,
                'passenger_name' => 'Passenger Demo',
                'passenger_email' => 'passenger@example.test',
                'passenger_phone' => '+18095550001',
                'seat_numbers' => [],
                'status' => 'draft',
                'expires_at' => null,
                'confirmed_at' => null,
                'total_amount' => 0,
            ]
        );
    }

    private function seedBusSeats(Bus $bus): void
    {
        $letters = ['A', 'B', 'C', 'D'];
        $created = 0;
        $row = 1;

        while ($created < $bus->capacity) {
            foreach ($letters as $index => $letter) {
                if ($created >= $bus->capacity) {
                    break;
                }

                BusSeat::query()->updateOrCreate(
                    [
                        'bus_id' => $bus->id,
                        'seat_number' => $row.$letter,
                    ],
                    [
                        'seat_class' => 'standard',
                        'window' => in_array($index, [0, 3], true),
                        'aisle' => in_array($index, [1, 2], true),
                        'active' => true,
                    ]
                );

                $created++;
            }

            $row++;
        }
    }
}
