<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransportRoute extends Model
{
    protected $fillable = [
        'origin','destination','origin_latitude','origin_longitude','destination_latitude','destination_longitude',
        'distance_km','distance_meters','duration_seconds','route_geometry','active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'origin_latitude' => 'decimal:7',
        'origin_longitude' => 'decimal:7',
        'destination_latitude' => 'decimal:7',
        'destination_longitude' => 'decimal:7',
        'route_geometry' => 'array',
    ];

    public function trips(): HasMany { return $this->hasMany(Trip::class); }
    public function stops(): HasMany { return $this->hasMany(RouteStop::class); }
}
