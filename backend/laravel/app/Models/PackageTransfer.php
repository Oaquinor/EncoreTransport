<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageTransfer extends Model
{
    protected $fillable = [
        'package_id', 'from_driver_id', 'to_driver_id', 'requested_by_user_id',
        'accepted_by_user_id', 'status', 'notes', 'requested_at', 'accepted_at',
    ];

    protected $casts = ['requested_at' => 'datetime', 'accepted_at' => 'datetime'];

    public function package(): BelongsTo { return $this->belongsTo(TransportPackage::class); }
    public function fromDriver(): BelongsTo { return $this->belongsTo(Driver::class, 'from_driver_id'); }
    public function toDriver(): BelongsTo { return $this->belongsTo(Driver::class, 'to_driver_id'); }
}
