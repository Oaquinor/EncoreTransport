<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Trip extends Model
{
    protected $fillable = ['transport_route_id', 'bus_id', 'driver_id', 'departure_date', 'departure_time', 'arrival_time', 'status', 'available_seats', 'price_per_passenger', 'seat_map'];
    protected $casts = ['departure_date' => 'date', 'seat_map' => 'array'];

    public function route(): BelongsTo { return $this->belongsTo(TransportRoute::class, 'transport_route_id'); }
    public function bus(): BelongsTo { return $this->belongsTo(Bus::class); }
    public function driver(): BelongsTo { return $this->belongsTo(Driver::class); }
}