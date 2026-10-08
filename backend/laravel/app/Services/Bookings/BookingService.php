<?php

namespace App\Services\Bookings;

use App\Models\Booking;
use App\Models\BusSeat;
use App\Models\Trip;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function create(array $data, ?int $userId = null): Booking
    {
        return DB::transaction(function () use ($data, $userId) {
            $trip = Trip::query()->whereKey($data['trip_id'])->lockForUpdate()->firstOrFail();

            if (!in_array($trip->status, ['scheduled', 'boarding'], true)) {
                throw ValidationException::withMessages(['trip_id' => 'This trip is not available for booking.']);
            }

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

            $lead = $data['passengers'][0];
            $booking = Booking::query()->create([
                'public_id' => (string) Str::uuid(),
                'user_id' => $userId,
                'reference' => 'ET-'.strtoupper(Str::random(10)),
                'trip_id' => $trip->id,
                'passenger_name' => $lead['full_name'],
                'passenger_email' => $lead['email'] ?? '',
                'passenger_phone' => $lead['phone'] ?? '',
                'seat_numbers' => $seats->pluck('seat_number')->values()->all(),
                'status' => 'pending_payment',
                'expires_at' => now()->addMinutes((int) config('encore.booking_hold_minutes', 15)),
                'total_amount' => ((int) $trip->price_per_passenger) * count($seatIds),
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

            $trip->available_seats = max(0, (int) $trip->available_seats - count($seatIds));
            $trip->save();

            return $booking->load(['trip.route', 'reservedSeats.seat', 'passengers']);
        }, 3);
    }
}
