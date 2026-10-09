<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class DriverSchedule extends Model {
    protected $fillable=['driver_id','bus_id','trip_id','work_date','starts_at','ends_at','status','notes','updated_by_user_id'];
    protected $casts=['work_date'=>'date'];
    public function driver():BelongsTo{return $this->belongsTo(Driver::class);}
    public function bus():BelongsTo{return $this->belongsTo(Bus::class);}
    public function trip():BelongsTo{return $this->belongsTo(Trip::class);}
    public function updatedBy():BelongsTo{return $this->belongsTo(User::class,'updated_by_user_id');}
}
