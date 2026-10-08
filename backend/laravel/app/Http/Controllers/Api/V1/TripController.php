<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Trip;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class TripController extends Controller
{
    #[OA\Get(path:'/api/v1/trips/search',operationId:'searchTrips',summary:'Buscar viajes disponibles',tags:['Trips'],responses:[new OA\Response(response:200,description:'Viajes')])]
    public function search(Request $request)
    {
        $filters=$request->validate([
            'origin'=>['nullable','string','max:150'],
            'destination'=>['nullable','string','max:150'],
            'date'=>['nullable','date_format:Y-m-d'],
            'passengers'=>['nullable','integer','min:1','max:10'],
        ]);
        $passengers=(int)($filters['passengers']??1);
        $trips=Trip::query()->with(['route','bus','driver'])
            ->whereIn('status',['scheduled','boarding'])
            ->when($filters['origin']??null,fn($q,$v)=>$q->whereHas('route',fn($r)=>$r->where('origin','like','%'.$v.'%')))
            ->when($filters['destination']??null,fn($q,$v)=>$q->whereHas('route',fn($r)=>$r->where('destination','like','%'.$v.'%')))
            ->when($filters['date']??null,fn($q,$v)=>$q->whereDate('departure_date',$v))
            ->where('available_seats','>=',$passengers)
            ->orderBy('departure_date')->orderBy('departure_time')->get();
        return TripResource::collection($trips);
    }

    public function show(Trip $trip)
    {
        return new TripResource($trip->load(['route.stops','bus','driver']));
    }
}
