<?php

namespace App\Services\Bookings;

use App\Models\BookingSeat;
use App\Models\Trip;
use Illuminate\Support\Collection;

class SeatAvailabilityService
{
    public function reservedSeatIds(Trip $trip, array $segment, bool $lock = false): Collection
    {
        $query = BookingSeat::query()
            ->where('trip_id', $trip->id)
            ->where('origin_stop_sequence', '<', $segment['destination_sequence'])
            ->where('destination_stop_sequence', '>', $segment['origin_sequence'])
            ->where(function ($query) {
                $query->where('status', 'confirmed')
                    ->orWhere(function ($held) {
                        $held->where('status', 'held')
                            ->where(function ($time) {
                                $time->whereNull('held_until')->orWhere('held_until', '>', now());
                            });
                    });
            });

        if ($lock) $query->lockForUpdate();

        return $query->distinct()->pluck('bus_seat_id');
    }

    public function availableCount(Trip $trip, array $segment): int
    {
        $capacity = $trip->bus?->seats()
            ->where('active', true)
            ->where('blocked', false)
            ->count() ?? 0;

        return max(0, $capacity - $this->reservedSeatIds($trip, $segment)->unique()->count());
    }

    public function hasReservedSeats(Trip $trip, array $segment, array $seatIds, bool $lock = false): bool
    {
        return $this->reservedSeatIds($trip, $segment, $lock)
            ->intersect($seatIds)
            ->isNotEmpty();
    }
}
