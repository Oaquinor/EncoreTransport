<?php

namespace App\Services\Notifications;

use App\Models\User;
use App\Models\UserNotification;

/** Notification boundary: delivery failure is observable and never blocks booking. */
class NotificationService
{
    public function __construct(private readonly EmailNotificationChannel $email, private readonly WhatsAppNotificationChannel $whatsapp) {}

    public function sendEmail(?User $recipient, string $event, array $payload = []): bool { return $this->email->send($recipient, $event, $payload); }

    public function sendEmailToAddress(string $address, string $event, array $payload = []): bool { return $this->email->sendToAddress($address, $event, $payload); }

    public function sendWhatsApp(?User $recipient, string $event, array $payload = []): bool
    {
        return $this->whatsapp->send($recipient, $event, $payload);
    }

    public function database(?User $recipient, string $type, string $title, string $body, array $data = []): ?UserNotification
    {
        if (!$recipient) return null;
        return UserNotification::query()->create([
            'user_id' => $recipient->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);
    }
}
