<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiActionLog extends Model
{
    protected $fillable = [
        'agent', 'channel', 'user_id', 'role', 'permissions', 'session_id',
        'tool', 'arguments', 'result', 'confirmation_required',
        'confirmation_result', 'error',
    ];

    protected $casts = [
        'permissions' => 'array',
        'arguments' => 'array',
        'result' => 'array',
        'confirmation_required' => 'boolean',
    ];
}
