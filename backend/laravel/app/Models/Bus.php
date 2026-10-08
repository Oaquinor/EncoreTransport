<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Bus extends Model { protected $fillable=['code','plate','capacity','status']; public function seats():HasMany{return $this->hasMany(BusSeat::class);} public function trips():HasMany{return $this->hasMany(Trip::class);} }
