<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class VehicleStatusReport extends Model {
    protected $fillable=['bus_id','driver_id','trip_id','fuel_status','engine_status','tires_status','network_status','fuel_percent','notes','reported_at'];
    protected $casts=['fuel_percent'=>'integer','reported_at'=>'datetime'];
    public function bus():BelongsTo{return $this->belongsTo(Bus::class);}
    public function driver():BelongsTo{return $this->belongsTo(Driver::class);}
    public function trip():BelongsTo{return $this->belongsTo(Trip::class);}
}
