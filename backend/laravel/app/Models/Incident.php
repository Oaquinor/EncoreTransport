<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Incident extends Model {
    protected $fillable=['trip_id','driver_id','reported_by_user_id','title','description','severity','status','resolved_at'];
    protected $casts=['resolved_at'=>'datetime'];
    public function trip(): BelongsTo { return $this->belongsTo(Trip::class); }
    public function driver(): BelongsTo { return $this->belongsTo(Driver::class); }
}
