<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class PackageEvent extends Model {
    protected $fillable=['package_id','user_id','status','notes','occurred_at'];
    protected $casts=['occurred_at'=>'datetime'];
    public function package():BelongsTo{return $this->belongsTo(TransportPackage::class,'package_id');}
    public function user():BelongsTo{return $this->belongsTo(User::class);}
}
