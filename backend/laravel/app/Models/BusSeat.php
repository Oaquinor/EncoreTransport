<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class BusSeat extends Model {
    protected $fillable=['bus_id','seat_number','row_number','position_index','seat_class','seat_type','window','aisle','accessible','blocked','active'];
    protected $casts=['row_number'=>'integer','position_index'=>'integer','window'=>'boolean','aisle'=>'boolean','accessible'=>'boolean','blocked'=>'boolean','active'=>'boolean'];
    public function bus():BelongsTo{return $this->belongsTo(Bus::class);}
}
