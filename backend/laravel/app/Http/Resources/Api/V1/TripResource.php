<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'routeName' => $this->route?->origin && $this->route?->destination ? $this->route->origin . ' → ' . $this->route->destination : $this->route_name ?? '',
            'origin' => $this->route?->origin ?? $this->origin ?? '',
            'destination' => $this->route?->destination ?? $this->destination ?? '',
            'date' => $this->departure_date?->toDateString() ?? $this->date ?? '',
            'departureTime' => $this->departure_time ?? '',
            'arrivalTime' => $this->arrival_time ?? '',
            'durationMinutes' => $this->duration_minutes ?? 0,
            'baseFare' => $this->price_per_passenger ?? 0,
            'busId' => $this->bus?->name ?? $this->bus_id ?? '',
            'driverId' => $this->driver?->name ?? $this->driver_id ?? '',
            'status' => $this->status,
            'availableSeats' => $this->available_seats ?? 0,
            'seatMap' => $this->seat_map ?? [],
            'highlights' => [],
        ];
    }
}