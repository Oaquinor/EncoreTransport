<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Trip;
use Illuminate\Http\Request;
use App\Services\Bookings\SeatAvailabilityService;
use App\Services\Routes\RouteSegmentService;
use OpenApi\Attributes as OA;

class TripController extends Controller
{
    #[OA\Get(path:'/api/v1/trips/search',operationId:'searchTrips',summary:'Buscar viajes disponibles',tags:['Trips'],responses:[new OA\Response(response:200,description:'Viajes')])]
    public function search(Request $request, RouteSegmentService $segments, SeatAvailabilityService $availability)
    {
        $filters=$request->validate([
            'origin'=>['nullable','string','max:150'],
            'destination'=>['nullable','string','max:150'],
            'date'=>['nullable','date_format:Y-m-d'],
            'passengers'=>['nullable','integer','min:1','max:10'],
        ]);
        $passengers=(int)($filters['passengers']??1);
        $trips=Trip::query()->with(['route.stops','bus','driver'])
            ->whereIn('status',['scheduled','boarding'])
            // Segment matching is resolved against ordered route stops below.
            ->when($filters['date']??null,fn($q,$v)=>$q->whereDate('departure_date',$v))
            ->orderBy('departure_date')->orderBy('departure_time')->get()
            ->filter(function (Trip $trip) use ($filters, $passengers, $segments) {
                try {
                    $segment = $segments->resolve($trip->route, $filters['origin'] ?? null, $filters['destination'] ?? null);
                    if ($availability->availableCount($trip, $segment) < $passengers) return false;
                    $trip->setAttribute('_requested_segment', $segment);
                    return true;
                }
                catch (\Illuminate\Validation\ValidationException) { return false; }
            })->values();
        return TripResource::collection($trips);
    }

    public function show(Trip $trip)
    {
        return new TripResource($trip->load(['route.stops','bus','driver']));
    }
}
