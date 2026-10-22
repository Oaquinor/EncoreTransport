<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class BookingSeat extends Model { protected $fillable=['booking_id','trip_id','bus_seat_id','origin_stop_sequence','destination_stop_sequence','status','held_until']; protected $casts=['origin_stop_sequence'=>'integer','destination_stop_sequence'=>'integer','held_until'=>'datetime']; public function booking():BelongsTo{return $this->belongsTo(Booking::class);} public function trip():BelongsTo{return $this->belongsTo(Trip::class);} public function seat():BelongsTo{return $this->belongsTo(BusSeat::class,'bus_seat_id');} }
