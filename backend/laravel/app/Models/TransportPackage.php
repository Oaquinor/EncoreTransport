<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class TransportPackage extends Model {
    protected $table='packages';
    protected $fillable=['public_id','tracking_token_hash','qr_token_hash','qr_payload','trip_id','driver_id','reference','status','sender_name','recipient_name','recipient_phone','recipient_email','description','delivered_at','recipient_verified_at','delivery_photo_path'];
    protected $hidden=['tracking_token_hash','qr_token_hash','qr_payload','recipient_phone','recipient_email'];
    protected $casts=['delivered_at'=>'datetime','recipient_verified_at'=>'datetime'];
    public function trip():BelongsTo{return $this->belongsTo(Trip::class);}
    public function driver():BelongsTo{return $this->belongsTo(Driver::class);}
    public function events():HasMany{return $this->hasMany(PackageEvent::class,'package_id');}
    public function transfers():HasMany{return $this->hasMany(PackageTransfer::class,'package_id');}
    public function manifestItems():HasMany{return $this->hasMany(PackageManifestItem::class,'package_id');}
    public function authorizations():HasMany{return $this->hasMany(PackageAuthorization::class,'package_id');}
}
