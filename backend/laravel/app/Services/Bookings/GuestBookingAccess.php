<?php

namespace App\Services\Bookings;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GuestBookingAccess
{
    public const HEADER = 'X-Guest-Booking-Token';

    public function issue(): array
    {
        $plainToken = Str::random(64);

        return ['plain' => $plainToken, 'hash' => hash('sha256', $plainToken)];
    }

    public function matches(Request $request, Booking $booking): bool
    {
        $plainToken = (string) $request->header(self::HEADER, '');
        $storedHash = (string) ($booking->guest_access_token_hash ?? '');

        return $plainToken !== '' && $storedHash !== '' && hash_equals($storedHash, hash('sha256', $plainToken));
    }
}
