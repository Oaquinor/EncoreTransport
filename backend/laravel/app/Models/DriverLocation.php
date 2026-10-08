<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DriverLocation extends Model {
    protected $fillable = ['driver_id','trip_id','latitude','longitude','heading','speed_kph','recorded_at'];
    protected $casts = ['recorded_at'=>'datetime','latitude'=>'decimal:7','longitude'=>'decimal:7'];
}
