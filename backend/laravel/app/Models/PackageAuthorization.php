<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageAuthorization extends Model
{
    protected $fillable = ['package_id', 'user_id', 'authorized_by_user_id', 'status', 'authorized_at', 'revoked_at'];
    protected $casts = ['authorized_at' => 'datetime', 'revoked_at' => 'datetime'];

    public function package(): BelongsTo { return $this->belongsTo(TransportPackage::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
