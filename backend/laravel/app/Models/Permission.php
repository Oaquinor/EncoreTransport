<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    protected $fillable = ['key', 'label', 'resource'];
    public function roles(): BelongsToMany { return $this->belongsToMany(Role::class); }
    public function users(): BelongsToMany { return $this->belongsToMany(User::class)->withPivot(['granted', 'assigned_by_user_id'])->withTimestamps(); }
}
