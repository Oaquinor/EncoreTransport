<?php

namespace App\Services\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Mail\EncoreEventMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class EmailNotificationChannel implements NotificationChannel
{
    public function send(?User $recipient, string $event, array $payload = []): bool
    {
        if (!$recipient?->email) return false;
        try {
            Mail::to($recipient->email)->queue(new EncoreEventMail($event, $payload));
            return true;
        } catch (\Throwable $exception) {
            Log::warning('encore.notification.email.failed', ['event'=>$event,'message'=>$exception->getMessage()]);
            return false;
        }
    }
}
