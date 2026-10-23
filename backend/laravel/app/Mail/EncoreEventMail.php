<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EncoreEventMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly string $event, public readonly array $payload = []) {}

    public function build(): self
    {
        return $this->subject('Encore Transport — '.str_replace('_', ' ', $this->event))
            ->view('emails.encore-event')
            ->text('emails.encore-event-text');
    }
}
