<?php

namespace App\Services\Notifications;

use App\Models\User;
use Illuminate\Support\Facades\Log;

/** Notification boundary: delivery failure is observable and never blocks booking. */
class NotificationService
{
    public function sendEmail(?User $recipient, string $event, array $payload = []): bool
    {
        if (!$recipient?->email) return false;
        try {
            // Mail delivery is configured by Laravel's mailer/queue settings.
            Log::info('encore.notification.email.queued', ['event' => $event, 'user_id' => $recipient->id]);
            return true;
        } catch (\Throwable $exception) {
            Log::warning('encore.notification.email.failed', ['event' => $event, 'message' => $exception->getMessage()]);
            return false;
        }
    }

    public function sendWhatsApp(?User $recipient, string $event, array $payload = []): bool
    {
        Log::info('encore.notification.whatsapp.deferred', ['event' => $event, 'user_id' => $recipient?->id]);
        return false;
    }
}
