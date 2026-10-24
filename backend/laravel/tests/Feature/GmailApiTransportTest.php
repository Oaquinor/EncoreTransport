<?php

namespace Tests\Feature;

use App\Services\Mail\GmailApiTransport;
use App\Mail\EncoreEventMail;
use App\Services\Notifications\EmailNotificationChannel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class GmailApiTransportTest extends TestCase
{
    public function test_booking_mail_channel_can_queue_to_a_guest_email_address(): void
    {
        Mail::fake();

        $sent = (new EmailNotificationChannel())->sendToAddress('guest@example.test', 'booking_created', ['reference' => 'ET-123']);

        $this->assertTrue($sent);
        Mail::assertQueued(EncoreEventMail::class, fn ($mail) => $mail->hasTo('guest@example.test') && $mail->event === 'booking_created');
    }

    public function test_transport_refreshes_oauth_token_and_sends_raw_mime_message(): void
    {
        config([
            'services.google.gmail' => [
                'client_id' => 'client-id',
                'client_secret' => 'client-secret',
                'refresh_token' => 'refresh-token',
                'token_uri' => 'https://oauth2.googleapis.com/token',
                'api_uri' => 'https://gmail.googleapis.com/gmail/v1',
            ],
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'access-token'], 200),
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send' => Http::response(['id' => 'gmail-message-id'], 200),
        ]);

        $email = (new Email())
            ->from('tickets@example.test')
            ->to('passenger@example.test')
            ->subject('Your Encore Transport booking')
            ->text('Booking ET-123 is received.');

        (new GmailApiTransport())->send($email);

        Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/token'
            && $request['grant_type'] === 'refresh_token'
            && $request['refresh_token'] === 'refresh-token');
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/users/me/messages/send')
            && $request->hasHeader('Authorization', 'Bearer access-token')
            && str_contains(base64_decode(strtr($request['raw'], '-_', '+/')), 'Subject: Your Encore Transport booking'));
    }

    public function test_laravel_gmail_api_mailer_uses_the_registered_transport(): void
    {
        config([
            'mail.mailers.gmail_api.transport' => 'gmail_api',
            'services.google.gmail' => [
                'client_id' => 'client-id',
                'client_secret' => 'client-secret',
                'refresh_token' => 'refresh-token',
                'token_uri' => 'https://oauth2.googleapis.com/token',
                'api_uri' => 'https://gmail.googleapis.com/gmail/v1',
            ],
        ]);
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'access-token'], 200),
            'https://gmail.googleapis.com/gmail/v1/*' => Http::response(['id' => 'message-id'], 200),
        ]);

        Mail::mailer('gmail_api')->raw('Ready.', function ($message) {
            $message->from('tickets@example.test')->to('guest@example.test')->subject('Ready');
        });

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/users/me/messages/send'));
    }

    public function test_transport_fails_closed_when_refresh_token_is_missing(): void
    {
        config(['services.google.gmail' => ['client_id' => 'client-id', 'client_secret' => 'client-secret', 'refresh_token' => '']]);
        Http::fake();

        $this->expectException(\Symfony\Component\Mailer\Exception\TransportException::class);
        (new GmailApiTransport())->send((new Email())->from('tickets@example.test')->to('passenger@example.test')->text('Test'));
    }
}
