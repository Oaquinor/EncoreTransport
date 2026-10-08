<?php

namespace App\Services\Tickets;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Ticket;
use Illuminate\Support\Str;
use RuntimeException;

class TicketService
{
    public function issue(Booking $booking): Ticket
    {
        $paid = Payment::query()->where('booking_id', $booking->id)->where('status', 'paid')->exists();
        if (!$paid || $booking->status !== 'confirmed') {
            throw new RuntimeException('Ticket can only be issued after a verified paid booking.');
        }

        $existing = Ticket::query()->where('booking_id', $booking->id)->first();
        if ($existing) return $existing;

        $token = Str::random(64);
        $publicId = (string) Str::uuid();
        return Ticket::query()->create([
            'public_id' => $publicId,
            'booking_id' => $booking->id,
            'status' => 'active',
            'qr_payload' => json_encode(['ticket' => $publicId, 'token' => $token], JSON_THROW_ON_ERROR),
            'validation_token_hash' => hash('sha256', $token),
            'issued_at' => now(),
        ]);
    }
}
