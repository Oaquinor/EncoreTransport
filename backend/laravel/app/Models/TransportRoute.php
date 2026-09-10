<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransportRoute extends Model
{
    protected $fillable = ['origin', 'destination', 'distance_km', 'active'];
    protected $casts = ['active' => 'boolean'];
}