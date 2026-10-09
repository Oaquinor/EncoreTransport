<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BookingSeat;
use App\Models\Trip;
use App\Services\Bookings\BookingService;
use Illuminate\Support\Facades\DB;

class SeatController extends Controller
{
    public function index(Trip $trip, BookingService $bookings)
    {
        DB::transaction(fn () => $bookings->releaseExpiredHolds($trip));

        $reservedIds = BookingSeat::query()
            ->where('trip_id', $trip->id)
            ->where(function ($query) {
                $query->where('status', 'confirmed')
                    ->orWhere(function ($held) {
                        $held->where('status', 'held')
                            ->where(function ($time) {
                                $time->whereNull('held_until')
                                    ->orWhere('held_until', '>', now());
                            });
                    });
            })
            ->pluck('bus_seat_id');

        $seats = $trip->bus->seats()
            ->where('active', true)
            ->orderByRaw('COALESCE(`row_number`, 9999) ASC')
            ->orderByRaw('COALESCE(`position_index`, 9999) ASC')
            ->orderBy('seat_number')
            ->get()
            ->map(fn ($seat) => [
                'id' => $seat->id,
                'seat_number' => $seat->seat_number,
                'row_number' => $seat->row_number,
                'position_index' => $seat->position_index,
                'seat_class' => $seat->seat_class,
                'seat_type' => $seat->seat_type,
                'window' => $seat->window,
                'aisle' => $seat->aisle,
                'accessible' => $seat->accessible,
                'blocked' => $seat->blocked,
                'available' => !$seat->blocked && !$reservedIds->contains($seat->id),
            ]);

        $trip->forceFill([
            'available_seats' => $seats->where('available', true)->count(),
        ])->save();

        return response()->json([
            'data' => $seats->values(),
        ]);
    }
}
