<?php

namespace App\Services\Tickets;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Audit\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class TicketService
{
    public function __construct(private readonly AuditService $audit) {}

    public function issue(Booking $booking, ?User $actor = null): Ticket
    {
        $paid = Payment::query()
            ->where('booking_id', $booking->id)
            ->where('status', 'paid')
            ->exists();

        if (!$paid || $booking->status !== 'confirmed') {
            throw new RuntimeException('Ticket can only be issued after a verified paid booking.');
        }

        $existing = Ticket::query()->where('booking_id', $booking->id)->first();
        if ($existing) return $existing;

        $token = Str::random(64);
        $publicId = (string) Str::uuid();
        $ticket = Ticket::query()->create([
            'public_id' => $publicId,
            'booking_id' => $booking->id,
            'status' => 'active',
            'qr_payload' => json_encode(['ticket' => $publicId, 'token' => $token], JSON_THROW_ON_ERROR),
            'validation_token_hash' => hash('sha256', $token),
            'issued_at' => now(),
        ]);

        $this->audit->record($actor, 'ticket.issued', $ticket, ['booking_id' => $booking->id]);
        return $ticket;
    }

    public function validateToken(string $publicId, string $plainToken, ?User $actor = null): Ticket
    {
        return DB::transaction(function () use ($publicId, $plainToken, $actor) {
            $ticket = Ticket::query()
                ->with(['booking.trip'])
                ->where('public_id', $publicId)
                ->lockForUpdate()
                ->first();

            if (!$ticket || !$ticket->validation_token_hash) {
                throw new RuntimeException('Ticket not found or not validatable.');
            }

            if (!hash_equals($ticket->validation_token_hash, hash('sha256', $plainToken))) {
                throw new RuntimeException('Invalid ticket token.');
            }

            if ($ticket->status !== 'active') {
                throw new RuntimeException('Ticket is not active.');
            }

            if ($ticket->used_at) {
                throw new RuntimeException('Ticket has already been used.');
            }

            if ($ticket->booking?->status !== 'confirmed') {
                throw new RuntimeException('The booking is not confirmed.');
            }

            if (!in_array($ticket->booking?->trip?->status, ['boarding', 'in_progress'], true)) {
                throw new RuntimeException('Ticket cannot be validated outside boarding or an active trip.');
            }

            $ticket->forceFill([
                'validated_at' => now(),
                'used_at' => now(),
                'status' => 'used',
            ])->save();

            $this->audit->record($actor, 'ticket.validated', $ticket, [
                'booking_id' => $ticket->booking_id,
                'trip_id' => $ticket->booking?->trip_id,
            ]);

            return $ticket->fresh(['booking.trip.route']);
        }, 3);
    }
}
