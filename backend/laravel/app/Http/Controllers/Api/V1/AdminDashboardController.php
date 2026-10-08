<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\Incident;
use App\Models\Payment;
use App\Models\TransportRoute;
use App\Models\Trip;
use OpenApi\Attributes as OA;
class AdminDashboardController extends Controller {
    #[OA\Get(path:'/api/v1/admin/dashboard',operationId:'adminDashboard',summary:'Real administrative dashboard',tags:['Admin'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Dashboard'),new OA\Response(response:403,description:'Admin only')])]
    public function show(){
        $trips=Trip::query()->with(['route','bus','driver'])->orderByDesc('departure_date')->orderBy('departure_time')->limit(200)->get();
        $bookings=Booking::query()->withCount('passengers')->latest()->limit(200)->get();
        $capacity=$trips->sum(fn($t)=>(int)($t->bus?->capacity??0)); $available=$trips->sum(fn($t)=>(int)$t->available_seats);
        $occupancy=$capacity>0?round((($capacity-$available)/$capacity)*100,1):0;
        $revenueMinor=(int)Payment::query()->where('status','paid')->sum('amount_minor');
        return response()->json(['data'=>[
            'metrics'=>[
                'tripsToday'=>Trip::query()->whereDate('departure_date',today())->count(),
                'bookings'=>Booking::query()->count(),
                'passengers'=>Booking::query()->withCount('passengers')->get()->sum('passengers_count'),
                'revenue'=>$revenueMinor/100,
                'occupancy'=>$occupancy,
                'pendingBookings'=>Booking::query()->where('status','pending_payment')->count(),
                'availableBuses'=>Bus::query()->where('status','operational')->count(),
                'activeDrivers'=>Driver::query()->whereIn('status',['active','upcoming'])->count(),
                'incidents'=>class_exists(Incident::class)?Incident::query()->where('status','open')->count():0,
            ],
            'trips'=>$trips,'bookings'=>$bookings,'buses'=>Bus::query()->orderBy('code')->get(),
            'routes'=>TransportRoute::query()->where('active',true)->orderBy('origin')->get(),
            'drivers'=>Driver::query()->orderBy('name')->get(),
        ]]);
    }
}
