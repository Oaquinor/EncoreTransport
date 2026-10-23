<?php

namespace App\Contracts\Notifications;

use App\Models\User;

interface NotificationChannel
{
    public function send(?User $recipient, string $event, array $payload = []): bool;
}
