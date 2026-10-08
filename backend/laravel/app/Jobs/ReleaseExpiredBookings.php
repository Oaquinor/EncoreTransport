<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Models\BookingSeat;
use App\Models\BusSeat;
use App\Models\Trip;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class ReleaseExpiredBookings implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $ids = Booking::query()
            ->where('status', 'pending_payment')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->pluck('id');

        foreach ($ids as $bookingId) {
            DB::transaction(function () use ($bookingId) {
                $booking = Booking::query()->whereKey($bookingId)->lockForUpdate()->first();
                if (!$booking || $booking->status !== 'pending_payment' || !$booking->expires_at?->isPast()) {
                    return;
                }

                $trip = Trip::query()->whereKey($booking->trip_id)->lockForUpdate()->first();

                BookingSeat::query()
                    ->where('booking_id', $booking->id)
                    ->where('status', 'held')
                    ->delete();

                $booking->forceFill(['status' => 'expired'])->save();

                if ($trip) {
                    $total = BusSeat::query()->where('bus_id', $trip->bus_id)->where('active', true)->count();
                    $reserved = BookingSeat::query()
                        ->where('trip_id', $trip->id)
                        ->where(function ($query) {
                            $query->where('status', 'confirmed')
                                ->orWhere(function ($held) {
                                    $held->where('status', 'held')
                                        ->where(function ($time) {
                                            $time->whereNull('held_until')->orWhere('held_until', '>', now());
                                        });
                                });
                        })
                        ->count();
                    $trip->forceFill(['available_seats' => max(0, $total - $reserved)])->save();
                }
            }, 3);
        }
    }
}
