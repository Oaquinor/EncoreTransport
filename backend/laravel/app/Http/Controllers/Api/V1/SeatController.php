<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\BookingSeat;
use App\Models\Trip;
class SeatController extends Controller {
    public function index(Trip $trip) {
        $reserved = BookingSeat::query()->where('trip_id',$trip->id)->pluck('bus_seat_id');
        $seats = $trip->bus->seats()->where('active',true)->orderBy('seat_number')->get()->map(fn($s)=>[
            'id'=>$s->id,'seat_number'=>$s->seat_number,'seat_class'=>$s->seat_class,'window'=>$s->window,'aisle'=>$s->aisle,'available'=>!$reserved->contains($s->id)
        ]);
        return response()->json(['data'=>$seats]);
    }
}
