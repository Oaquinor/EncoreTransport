<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = ['trip_id', 'passenger_name', 'passenger_email', 'passenger_phone', 'seat_numbers', 'status', 'total_amount'];
    protected $casts = ['seat_numbers' => 'array'];
}