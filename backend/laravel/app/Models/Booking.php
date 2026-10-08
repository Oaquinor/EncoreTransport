<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    protected $fillable = [
        'public_id','user_id','reference','trip_id','passenger_name','passenger_email','passenger_phone','seat_numbers',
        'status','expires_at','confirmed_at','total_amount',
    ];
    protected $casts = ['seat_numbers'=>'array','expires_at'=>'datetime','confirmed_at'=>'datetime'];

    public function trip(): BelongsTo { return $this->belongsTo(Trip::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function passengers(): HasMany { return $this->hasMany(BookingPassenger::class); }
    public function reservedSeats(): HasMany { return $this->hasMany(BookingSeat::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }
    public function ticket(): HasOne { return $this->hasOne(Ticket::class); }
}
