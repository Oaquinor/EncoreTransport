<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RouteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'=>$this->id,'origin'=>$this->origin,'destination'=>$this->destination,
            'distance_km'=>$this->distance_km,'distance_meters'=>$this->distance_meters,'duration_seconds'=>$this->duration_seconds,
            'origin_coordinates'=>$this->origin_latitude!==null?['latitude'=>(float)$this->origin_latitude,'longitude'=>(float)$this->origin_longitude]:null,
            'destination_coordinates'=>$this->destination_latitude!==null?['latitude'=>(float)$this->destination_latitude,'longitude'=>(float)$this->destination_longitude]:null,
            'route_geometry'=>$this->route_geometry,'active'=>(bool)$this->active,
            'stops'=>$this->whenLoaded('stops',fn()=> $this->stops->sortBy('sequence')->values()),
        ];
    }
}
