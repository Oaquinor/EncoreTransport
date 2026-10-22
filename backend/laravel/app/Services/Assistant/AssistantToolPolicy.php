<?php

namespace App\Services\Assistant;

use App\Models\User;

class AssistantToolPolicy
{
    public const READ = 'READ';
    public const WRITE_SAFE = 'WRITE-SAFE';
    public const CONFIRMATION_REQUIRED = 'CONFIRMATION-REQUIRED';
    public const HIGH_RISK = 'HIGH-RISK';

    public function authorize(User $user, string $tool, string $risk, ?string $permission = null): bool
    {
        if (!$user->active || in_array($risk, [self::HIGH_RISK, self::CONFIRMATION_REQUIRED], true)) return false;
        return !$permission || $user->can($permission);
    }
}
