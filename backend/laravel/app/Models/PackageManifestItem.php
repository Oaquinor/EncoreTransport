<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageManifestItem extends Model
{
    protected $fillable = ['manifest_id', 'package_id', 'scanned_by_user_id', 'status', 'scanned_at'];

    protected $casts = ['scanned_at' => 'datetime'];

    public function manifest(): BelongsTo { return $this->belongsTo(PackageManifest::class, 'manifest_id'); }
    public function package(): BelongsTo { return $this->belongsTo(TransportPackage::class); }
}
