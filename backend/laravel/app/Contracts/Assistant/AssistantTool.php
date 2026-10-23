<?php

namespace App\Contracts\Assistant;

use App\Models\User;

interface AssistantTool
{
    public function name(): string;
    public function description(): string;
    public function risk(): string;
    public function requiredPermission(): ?string;
    public function execute(User $user, array $input): array;
}
