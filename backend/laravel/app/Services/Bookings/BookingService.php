<?php

namespace App\Services\Bookings;

use App\Models\Booking;
use App\Models\BookingSeat;
use App\Models\BusSeat;
use App\Models\Trip;
use App\Services\Pricing\PricingService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function create(array $data, ?int $userId = null): Booking
    {
        return DB::transaction(function () use ($data, $userId) {
            $trip = Trip::query()
                ->with('bus')
                ->whereKey($data['trip_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!in_array($trip->status, ['scheduled', 'boarding'], true)) {
                throw ValidationException::withMessages(['trip_id' => 'This trip is not available for booking.']);
            }

            $this->releaseExpiredHolds($trip);

            $seatIds = array_values(array_unique(array_map('intval', $data['seat_ids'])));
            if (count($seatIds) !== count($data['seat_ids'])) {
                throw ValidationException::withMessages(['seat_ids' => 'Duplicate seats are not allowed.']);
            }

            $seats = BusSeat::query()
                ->where('bus_id', $trip->bus_id)
                ->where('active', true)
                ->whereIn('id', $seatIds)
                ->lockForUpdate()
                ->get();

            if ($seats->count() !== count($seatIds)) {
                throw ValidationException::withMessages(['seat_ids' => 'One or more seats do not belong to this trip bus.']);
            }

            if (count($data['passengers']) !== count($seatIds)) {
                throw ValidationException::withMessages(['passengers' => 'A passenger is required for each selected seat.']);
            }

            $alreadyReserved = BookingSeat::query()
                ->where('trip_id', $trip->id)
                ->whereIn('bus_seat_id', $seatIds)
                ->where(function ($query) {
                    $query->where('status', 'confirmed')
                        ->orWhere(function ($held) {
                            $held->where('status', 'held')
                                ->where(function ($time) {
                                    $time->whereNull('held_until')->orWhere('held_until', '>', now());
                                });
                        });
                })
                ->lockForUpdate()
                ->exists();

            if ($alreadyReserved) {
                throw ValidationException::withMessages(['seat_ids' => 'One or more selected seats are no longer available.']);
            }

            $quote = $this->pricing->quote($trip, count($seatIds));
            $lead = $data['passengers'][0];
            $booking = Booking::query()->create([
                'public_id' => (string) Str::uuid(),
                'user_id' => $userId,
                'reference' => 'ET-'.strtoupper(Str::random(10)),
                'trip_id' => $trip->id,
                'passenger_name' => $lead['full_name'],
                'passenger_email' => $lead['email'] ?? '',
                'passenger_phone' => $lead['phone'] ?? '',
                'seat_numbers' => $seats->sortBy('seat_number')->pluck('seat_number')->values()->all(),
                'status' => 'pending_payment',
                'expires_at' => now()->addMinutes((int) config('encore.booking_hold_minutes', 15)),
                'total_amount' => $quote['total'],
            ]);

            foreach ($data['passengers'] as $passenger) {
                $booking->passengers()->create($passenger);
            }

            try {
                foreach ($seats as $seat) {
                    $booking->reservedSeats()->create([
                        'trip_id' => $trip->id,
                        'bus_seat_id' => $seat->id,
                        'status' => 'held',
                        'held_until' => $booking->expires_at,
                    ]);
                }
            } catch (QueryException $e) {
                if (in_array($e->getCode(), ['23000', '23505'], true)) {
                    throw ValidationException::withMessages(['seat_ids' => 'One of the selected seats was just reserved by another passenger.']);
                }
                throw $e;
            }

            $this->refreshAvailableSeats($trip);

            return $booking->load(['trip.route', 'reservedSeats.seat', 'passengers']);
        }, 3);
    }

    private function releaseExpiredHolds(Trip $trip): void
    {
        $expired = BookingSeat::query()
            ->where('trip_id', $trip->id)
            ->where('status', 'held')
            ->whereNotNull('held_until')
            ->where('held_until', '<=', now())
            ->lockForUpdate()
            ->get();

        if ($expired->isEmpty()) {
            return;
        }

        $bookingIds = $expired->pluck('booking_id')->unique()->values();
        BookingSeat::query()->whereIn('id', $expired->pluck('id'))->delete();
        Booking::query()->whereIn('id', $bookingIds)->where('status', 'pending_payment')->update(['status' => 'expired']);
    }

    private function refreshAvailableSeats(Trip $trip): void
    {
        $totalSeats = BusSeat::query()->where('bus_id', $trip->bus_id)->where('active', true)->count();
        $reservedSeats = BookingSeat::query()
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

        $trip->forceFill(['available_seats' => max(0, $totalSeats - $reservedSeats)])->save();
    }
}
