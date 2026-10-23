<?php

namespace Database\Seeders\Demo;

use App\Models\Booking;
use App\Models\Bus;
use App\Models\BusSeat;
use App\Models\Driver;
use App\Models\TransportRoute;
use App\Models\Trip;
use App\Models\RouteSegment;
use App\Models\RouteStop;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EncoreTransportDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment(['local','testing'])) {
            $this->command?->warn('Demo seeder skipped outside local/testing.');
            return;
        }

        $passenger=User::query()->updateOrCreate(['email'=>'passenger@example.test'],[
            'name'=>'Passenger Demo','role'=>'passenger','phone'=>'+18095550001','active'=>true,'password'=>Hash::make('password'),
        ]);
        $driverUser=User::query()->updateOrCreate(['email'=>'driver@example.test'],[
            'name'=>'Driver Demo','role'=>'driver','phone'=>'+18095550002','active'=>true,'password'=>Hash::make('password'),
        ]);
        $admin=User::query()->updateOrCreate(['email'=>'admin@example.test'],[
            'name'=>'Admin Demo','role'=>'admin','phone'=>'+18095550003','active'=>true,'password'=>Hash::make('password'),
        ]);

        $roles=Role::query()->whereIn('name',['superadmin','driver','passenger'])->pluck('id','name');
        foreach ([[$admin,'superadmin'],[$driverUser,'driver'],[$passenger,'passenger']] as [$user,$roleName]) {
            if ($roles->has($roleName)) {
                $user->roles()->syncWithoutDetaching([$roles->get($roleName)]);
            }
        }

        $route=TransportRoute::query()->updateOrCreate(['origin'=>'Georgetown','destination'=>'New Amsterdam'],['distance_km'=>110,'distance_meters'=>110000,'duration_seconds'=>12600,'active'=>true]);
        $stops = [['sequence'=>1,'name'=>'Georgetown','offset_minutes'=>0],['sequence'=>2,'name'=>'Rosignol','offset_minutes'=>75],['sequence'=>3,'name'=>'New Amsterdam','offset_minutes'=>210]];
        foreach ($stops as $stop) RouteStop::query()->updateOrCreate(['transport_route_id'=>$route->id,'sequence'=>$stop['sequence']],$stop);
        foreach ([['Georgetown','Rosignol',1,2,40,45000,4500],['Georgetown','New Amsterdam',1,3,85,110000,12600],['Rosignol','New Amsterdam',2,3,45,65000,8100]] as [$from,$to,$fromSequence,$toSequence,$price,$distance,$duration]) {
            RouteSegment::query()->updateOrCreate(['transport_route_id'=>$route->id,'origin_stop_sequence'=>$fromSequence,'destination_stop_sequence'=>$toSequence],['origin_name'=>$from,'destination_name'=>$to,'price'=>$price,'distance_meters'=>$distance,'duration_seconds'=>$duration,'active'=>true]);
        }
        $referenceSeatColumns = [
            [3, 4, 2, 1], [7, 8, 6, 5], [11, 12, 10, 9], [15, 16, 14, 13],
            [19, 20, 18, 17], [23, 24, 22, 21], [27, 28, 26, 25], [30, 29],
            [31, 32, 33, 34], [35, 36, 38, 37], [39, 40, 42, 41],
            [43, 44, 46, 45], [47, 48, 50, 49], [51, 52, 53, 54, 55],
        ];
        $seatNumbers = collect($referenceSeatColumns)->flatten()->map(fn ($seat) => (string) $seat)->all();
        $bus=Bus::query()->updateOrCreate(['code'=>'BUS-001'],['plate'=>'ET-314-AX','capacity'=>count($seatNumbers),'status'=>'operational']);
        $driver=Driver::query()->updateOrCreate(['license_number'=>'D-AL-5520'],['user_id'=>$driverUser->id,'name'=>'Driver Demo','status'=>'upcoming']);

        BusSeat::query()->where('bus_id', $bus->id)->whereNotIn('seat_number', $seatNumbers)->delete();
        foreach ($referenceSeatColumns as $column => $columnSeats) {
            foreach ($columnSeats as $position => $seatNumber) {
                BusSeat::query()->updateOrCreate(['bus_id'=>$bus->id,'seat_number'=>(string) $seatNumber],[
                    'row_number'=>$column + 1,
                    'position_index'=>count($columnSeats) === 2
                        ? $position + 4
                        : ($position < 2 ? $position + 1 : $position + 2),
                    'seat_class'=>'standard','seat_type'=>'seat',
                    'window'=>$position === 0 || $position === count($columnSeats) - 1,
                    'aisle'=>$position === 1 || $position === 2,
                    'accessible'=>false,'blocked'=>false,'active'=>true,
                ]);
            }
        }

        $trip=Trip::query()->updateOrCreate([
            'transport_route_id'=>$route->id,'bus_id'=>$bus->id,'driver_id'=>$driver->id,
            'departure_date'=>now()->addDays(3)->toDateString(),'departure_time'=>'07:00:00',
        ],[
            'arrival_time'=>'10:15:00','status'=>'scheduled','available_seats'=>$bus->seats()->where('active',true)->count(),
            'price_per_passenger'=>85,'seat_map'=>null,
        ]);

        Booking::query()->updateOrCreate(['reference'=>'ET-DEMO-BOOKING'],[
            'public_id'=>(string)Str::uuid(),'user_id'=>$passenger->id,'trip_id'=>$trip->id,
            'passenger_name'=>'Passenger Demo','passenger_email'=>'passenger@example.test','passenger_phone'=>'+18095550001',
            'seat_numbers'=>[],'status'=>'draft','expires_at'=>null,'confirmed_at'=>null,'total_amount'=>0,
        ]);
    }
}
