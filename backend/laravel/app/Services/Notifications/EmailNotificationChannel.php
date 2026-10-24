<?php

namespace App\Services\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Mail\EncoreEventMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class EmailNotificationChannel implements NotificationChannel
{
    public function send(?User $recipient, string $event, array $payload = []): bool
    {
        return $this->sendToAddress((string) ($recipient?->email ?? ''), $event, $payload);
    }

    public function sendToAddress(string $address, string $event, array $payload = []): bool
    {
        if (filter_var($address, FILTER_VALIDATE_EMAIL) === false) return false;
        try {
            $fromAddress = config('mail.from.address');
            $fromName = config('mail.from.name');
            if (Schema::hasTable('app_settings')) {
                $settings = DB::table('app_settings')->whereIn('key', ['mail.from_address', 'mail.from_name'])->pluck('value', 'key');
                $fromAddress = $settings->get('mail.from_address') ?: $fromAddress;
                $fromName = $settings->get('mail.from_name') ?: $fromName;
            }
            $mail = new EncoreEventMail($event, $payload);
            if (filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) $mail->from($fromAddress, $fromName ?: null);
            Mail::to($address)->queue($mail);
            return true;
        } catch (\Throwable $exception) {
            Log::warning('encore.notification.email.failed', ['event'=>$event,'message'=>$exception->getMessage()]);
            return false;
        }
    }
}
