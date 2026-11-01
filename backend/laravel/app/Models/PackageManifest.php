<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PackageManifest extends Model
{
    protected $fillable = [
        'public_id', 'trip_id', 'driver_id', 'created_by_user_id', 'reference',
        'status', 'expected_count', 'scanned_count', 'reconciled_at',
    ];

    protected $casts = ['reconciled_at' => 'datetime'];

    public function trip(): BelongsTo { return $this->belongsTo(Trip::class); }
    public function driver(): BelongsTo { return $this->belongsTo(Driver::class); }
    public function items(): HasMany { return $this->hasMany(PackageManifestItem::class, 'manifest_id'); }
}
