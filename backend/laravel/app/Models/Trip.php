<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Trip extends Model
{
    protected $fillable = [
        'transport_route_id','bus_id','driver_id','departure_date','departure_time','arrival_time','status',
        'started_at','completed_at','cancelled_at','available_seats','price_per_passenger','seat_map',
    ];

    protected $casts = [
        'departure_date' => 'date',
        'seat_map' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function route(): BelongsTo { return $this->belongsTo(TransportRoute::class, 'transport_route_id'); }
    public function bus(): BelongsTo { return $this->belongsTo(Bus::class); }
    public function driver(): BelongsTo { return $this->belongsTo(Driver::class); }
    public function bookings(): HasMany { return $this->hasMany(Booking::class); }
    public function incidents(): HasMany { return $this->hasMany(Incident::class); }
    public function locations(): HasMany { return $this->hasMany(DriverLocation::class); }
}
