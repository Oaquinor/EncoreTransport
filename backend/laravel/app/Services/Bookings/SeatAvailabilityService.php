<?php

namespace App\Services\Bookings;

use App\Models\BookingSeat;
use App\Models\BusSeat;
use App\Models\Trip;
use Illuminate\Support\Collection;

class SeatAvailabilityService
{
    public function reservedSeatIds(Trip $trip, array $segment, bool $lock = false): Collection
    {
        $query = BookingSeat::query()
            ->where('trip_id', $trip->id)
            ->whereHas('seat', fn ($seat) => $seat
                ->where('bus_id', $trip->bus_id)
                ->where('active', true)
                ->where('blocked', false))
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

    /** Calculate requested-segment availability for a page of trips with two batched queries. */
    public function availableCountsForTrips(iterable $trips, array $segmentsByTripId): array
    {
        $tripList = collect($trips)->values();
        if ($tripList->isEmpty()) return [];

        $tripIds = $tripList->pluck('id')->all();
        $busIds = $tripList->pluck('bus_id')->unique()->values()->all();
        $seats = BusSeat::query()
            ->whereIn('bus_id', $busIds)
            ->where('active', true)
            ->where('blocked', false)
            ->get(['id', 'bus_id']);
        $seatIds = $seats->pluck('id')->all();
        $capacities = $seats->countBy('bus_id');
        $reservations = BookingSeat::query()
            ->whereIn('trip_id', $tripIds)
            ->whereIn('bus_seat_id', $seatIds)
            ->where(function ($query) {
                $query->where('status', 'confirmed')
                    ->orWhere(fn ($held) => $held->where('status', 'held')
                        ->where(fn ($time) => $time->whereNull('held_until')->orWhere('held_until', '>', now())));
            })
            ->get(['trip_id', 'bus_seat_id', 'origin_stop_sequence', 'destination_stop_sequence']);

        $result = [];
        foreach ($tripList as $trip) {
            $segment = $segmentsByTripId[$trip->id] ?? null;
            if (!$segment) continue;
            $reserved = $reservations->where('trip_id', $trip->id)
                ->filter(fn ($bookingSeat) => $bookingSeat->origin_stop_sequence < $segment['destination_sequence']
                    && $bookingSeat->destination_stop_sequence > $segment['origin_sequence'])
                ->pluck('bus_seat_id')->unique()->count();
            $result[$trip->id] = max(0, (int) ($capacities[$trip->bus_id] ?? 0) - $reserved);
        }

        return $result;
    }

    public function hasReservedSeats(Trip $trip, array $segment, array $seatIds, bool $lock = false): bool
    {
        return $this->reservedSeatIds($trip, $segment, $lock)
            ->intersect($seatIds)
            ->isNotEmpty();
    }
}
