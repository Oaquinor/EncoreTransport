<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteStop extends Model
{
    protected $fillable = ['transport_route_id','sequence','name','latitude','longitude','offset_minutes'];
    protected $casts = ['latitude'=>'decimal:7','longitude'=>'decimal:7'];
    public function route(): BelongsTo { return $this->belongsTo(TransportRoute::class, 'transport_route_id'); }
}
