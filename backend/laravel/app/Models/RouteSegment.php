<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteSegment extends Model
{
    protected $fillable = [
        'transport_route_id',
        'origin_stop_sequence',
        'destination_stop_sequence',
        'origin_name',
        'destination_name',
        'price',
        'distance_meters',
        'duration_seconds',
        'active',
    ];

    protected $casts = [
        'price' => 'integer',
        'distance_meters' => 'integer',
        'duration_seconds' => 'integer',
        'active' => 'boolean',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(TransportRoute::class, 'transport_route_id');
    }
}
