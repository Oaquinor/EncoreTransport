<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;
    protected $fillable=['name','email','role','phone','active','password','profile_photo_path'];
    protected $hidden=['password','remember_token'];
    protected function casts(): array { return ['email_verified_at'=>'datetime','password'=>'hashed','active'=>'boolean']; }
    public function driver(): HasOne { return $this->hasOne(Driver::class); }
    public function bookings(): HasMany { return $this->hasMany(Booking::class); }
    public function roles(): BelongsToMany { return $this->belongsToMany(Role::class); }
    public function permissions(): BelongsToMany { return $this->belongsToMany(Permission::class)->withPivot(['granted', 'assigned_by_user_id'])->withTimestamps(); }
}
