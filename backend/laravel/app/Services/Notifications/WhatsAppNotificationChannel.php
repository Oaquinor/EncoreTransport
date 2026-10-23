<?php

namespace App\Services\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class WhatsAppNotificationChannel implements NotificationChannel
{
    public function send(?User $recipient, string $event, array $payload = []): bool
    {
        Log::info('encore.notification.whatsapp.deferred', ['event'=>$event,'user_id'=>$recipient?->id]);
        return false;
    }
}
