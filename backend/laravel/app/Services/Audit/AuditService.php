<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AuditService
{
    public function record(?User $user, string $action, ?Model $subject = null, array $context = []): void
    {
        AuditLog::query()->create([
            'user_id' => $user?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey() ? (string) $subject->getKey() : null,
            'ip_address' => request()?->ip(),
            'context' => $context ?: null,
        ]);
    }
}
