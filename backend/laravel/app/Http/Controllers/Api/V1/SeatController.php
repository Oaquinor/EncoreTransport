<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BookingSeat;
use App\Models\Trip;
use App\Services\Bookings\BookingService;
use Illuminate\Support\Facades\DB;

class SeatController extends Controller
{
    public function index(Trip $trip, BookingService $bookings)
    {
        DB::transaction(fn()=>$bookings->releaseExpiredHolds($trip));
        $reservedIds=BookingSeat::query()->where('trip_id',$trip->id)->where(function($q){
            $q->where('status','confirmed')->orWhere(fn($held)=>$held->where('status','held')->where(fn($t)=>$t->whereNull('held_until')->orWhere('held_until','>',now())));
        })->pluck('bus_seat_id');
        $seats=$trip->bus->seats()->where('active',true)->orderBy('seat_number')->get()->map(fn($seat)=>[
            'id'=>$seat->id,'seat_number'=>$seat->seat_number,'seat_class'=>$seat->seat_class,
            'window'=>$seat->window,'aisle'=>$seat->aisle,'available'=>!$reservedIds->contains($seat->id),
        ]);
        $trip->forceFill(['available_seats'=>$seats->where('available',true)->count()])->save();
        return response()->json(['data'=>$seats->values()]);
    }
}
