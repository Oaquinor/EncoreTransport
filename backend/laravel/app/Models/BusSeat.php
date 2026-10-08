<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class BusSeat extends Model {
    protected $fillable = ['bus_id','seat_number','seat_class','window','aisle','active'];
    protected $casts = ['window'=>'boolean','aisle'=>'boolean','active'=>'boolean'];
    public function bus(): BelongsTo { return $this->belongsTo(Bus::class); }
}
