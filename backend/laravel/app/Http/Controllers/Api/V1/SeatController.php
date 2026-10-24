<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\Bookings\BookingService;
use App\Services\Bookings\SeatAvailabilityService;
use App\Services\Routes\RouteSegmentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class SeatController extends Controller
{
    public function index(Request $request, Trip $trip, BookingService $bookings, RouteSegmentService $segments, SeatAvailabilityService $availability)
    {
        DB::transaction(fn () => $bookings->releaseExpiredHolds($trip));
        $filters = $request->validate(['origin'=>['nullable','string','max:150'],'destination'=>['nullable','string','max:150']]);
        $segment = $segments->resolve($trip->route()->with('stops')->firstOrFail(), $filters['origin'] ?? null, $filters['destination'] ?? null);

        $reservedIds = $availability->reservedSeatIds($trip, $segment);

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
