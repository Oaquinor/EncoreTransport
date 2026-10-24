<?php

namespace App\Http\Resources\Api\V1;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $durationMinutes=0;
        if($this->departure_date && $this->departure_time && $this->arrival_time){
            $departure=CarbonImmutable::parse($this->departure_date->toDateString().' '.$this->departure_time);
            $arrival=CarbonImmutable::parse($this->departure_date->toDateString().' '.$this->arrival_time);
            if($arrival->lessThan($departure)) $arrival=$arrival->addDay();
            $durationMinutes=$departure->diffInMinutes($arrival);
        }
        $requestedSegment = $this->getAttribute('_requested_segment');
        return [
            'id'=>$this->id,'routeId'=>(string)$this->transport_route_id,
            'routeName'=>$this->route?->origin && $this->route?->destination ? $this->route->origin.' → '.$this->route->destination : '',
            'origin'=>$requestedSegment['origin'] ?? $this->route?->origin ?? '',
            'destination'=>$requestedSegment['destination'] ?? $this->route?->destination ?? '',
            'date'=>$this->departure_date?->toDateString()??'','departureTime'=>$this->departure_time??'','arrivalTime'=>$this->arrival_time??'',
            'durationMinutes'=>$durationMinutes,'baseFare'=>(int)($requestedSegment['price'] ?? $this->price_per_passenger ?? 0),
            'busId'=>(string)$this->bus_id,'busCode'=>$this->bus?->code,'busCapacity'=>$this->bus?->capacity,
            'driverName'=>$this->driver?->name,
            'status'=>$this->status,'availableSeats'=>(int)($this->getAttribute('_requested_available_seats') ?? $this->available_seats ?? 0),
            'requested_origin'=>$requestedSegment['origin'] ?? null,
            'requested_destination'=>$requestedSegment['destination'] ?? null,
            'segment'=>$requestedSegment,
            'segment_price'=>$requestedSegment['price'] ?? null,
            'segment_duration'=>$requestedSegment['duration_seconds'] ?? null,
            'segment_distance'=>$requestedSegment['distance_meters'] ?? null,
            'route'=>$this->whenLoaded('route',fn()=>new RouteResource($this->route)),'highlights'=>[],
        ];
    }
}
