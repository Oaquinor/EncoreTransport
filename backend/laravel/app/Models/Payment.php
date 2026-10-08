<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Payment extends Model {
    protected $fillable = ['public_id','booking_id','gateway','status','amount_minor','currency','gateway_reference','metadata','verified_at'];
    protected $casts = ['metadata'=>'array','verified_at'=>'datetime'];
    public function booking(): BelongsTo { return $this->belongsTo(Booking::class); }
}
