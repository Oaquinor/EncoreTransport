<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    protected $fillable = ['payment_id','event','external_event_id','gateway_reference','payload'];
    protected $casts = ['payload'=>'array'];
    public function payment(): BelongsTo { return $this->belongsTo(Payment::class); }
}
