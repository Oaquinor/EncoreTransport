<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Ticket extends Model {
    protected $fillable = ['public_id','booking_id','status','qr_payload','issued_at','used_at'];
    protected $casts = ['issued_at'=>'datetime','used_at'=>'datetime'];
    public function booking(): BelongsTo { return $this->belongsTo(Booking::class); }
}
