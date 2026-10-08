<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    protected $fillable = [
        'public_id','booking_id','status','qr_payload','validation_token_hash','issued_at','used_at','validated_at',
    ];
    protected $hidden = ['validation_token_hash'];
    protected $casts = ['issued_at'=>'datetime','used_at'=>'datetime','validated_at'=>'datetime'];
    public function booking(): BelongsTo { return $this->belongsTo(Booking::class); }
}
