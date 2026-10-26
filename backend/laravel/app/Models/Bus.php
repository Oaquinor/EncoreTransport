<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
class Bus extends Model { protected $fillable=['code','plate','capacity','status']; protected $casts=['capacity'=>'integer']; public function seats():HasMany{return $this->hasMany(BusSeat::class)->orderBy('row_number')->orderBy('position_index')->orderBy('seat_number');} public function trips():HasMany{return $this->hasMany(Trip::class);} public function latestVehicleStatus():HasOne{return $this->hasOne(VehicleStatusReport::class)->latestOfMany('reported_at');} }
