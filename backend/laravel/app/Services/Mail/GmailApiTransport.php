<?php

namespace App\Services\Mail;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

/** Sends Laravel mail through Gmail API using a server-side OAuth refresh token. */
class GmailApiTransport extends AbstractTransport
{
    protected function doSend(SentMessage $message): void
    {
        $settings = config('services.google.gmail');
        foreach (['client_id', 'client_secret', 'refresh_token'] as $key) {
            if (!is_string($settings[$key] ?? null) || trim($settings[$key]) === '') {
                throw new TransportException('Gmail API mail is not fully configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.');
            }
        }

        try {
            $tokenResponse = Http::asForm()->acceptJson()->timeout(15)->post($settings['token_uri'], [
                'client_id' => $settings['client_id'],
                'client_secret' => $settings['client_secret'],
                'refresh_token' => $settings['refresh_token'],
                'grant_type' => 'refresh_token',
            ]);

            if (!$tokenResponse->successful() || !is_string($tokenResponse->json('access_token'))) {
                throw new TransportException('Google OAuth could not provide an access token for Gmail API.');
            }

            $raw = $message->getOriginalMessage()->toString();
            $raw = rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
            $sendResponse = Http::withToken($tokenResponse->json('access_token'))
                ->acceptJson()
                ->timeout(20)
                ->post(rtrim($settings['api_uri'], '/').'/users/me/messages/send', ['raw' => $raw]);

            if (!$sendResponse->successful()) {
                throw new TransportException('Gmail API rejected the message. Check the authorized sender and gmail.send scope.');
            }
        } catch (TransportException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            // Avoid putting OAuth credentials, message bodies, or provider response data in logs.
            throw new TransportException('Gmail API delivery failed: '.$exception->getMessage(), 0, $exception);
        }
    }

    public function __toString(): string
    {
        return 'gmail-api';
    }
}
