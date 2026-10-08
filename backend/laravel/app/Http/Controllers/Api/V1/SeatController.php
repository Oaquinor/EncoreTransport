<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingSeat;
use App\Models\Trip;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class SeatController extends Controller
{
    #[OA\Get(
        path: '/api/v1/trips/{trip}/seats',
        operationId: 'listTripSeats',
        summary: 'Consultar disponibilidad de asientos',
        tags: ['Seats'],
        parameters: [new OA\Parameter(name: 'trip', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Asientos del bus y su disponibilidad',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Seat')),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Viaje no encontrado'),
        ]
    )]
    public function index(Trip $trip)
    {
        DB::transaction(function () use ($trip) {
            $expired = BookingSeat::query()
                ->where('trip_id', $trip->id)
                ->where('status', 'held')
                ->whereNotNull('held_until')
                ->where('held_until', '<=', now())
                ->lockForUpdate()
                ->get();

            if ($expired->isNotEmpty()) {
                $bookingIds = $expired->pluck('booking_id')->unique()->values();
                BookingSeat::query()->whereIn('id', $expired->pluck('id'))->delete();
                Booking::query()
                    ->whereIn('id', $bookingIds)
                    ->where('status', 'pending_payment')
                    ->update(['status' => 'expired']);
            }
        });

        $reservedIds = BookingSeat::query()
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
            ->pluck('bus_seat_id');

        $seats = $trip->bus->seats()
            ->where('active', true)
            ->orderBy('seat_number')
            ->get()
            ->map(fn ($seat) => [
                'id' => $seat->id,
                'seat_number' => $seat->seat_number,
                'seat_class' => $seat->seat_class,
                'window' => $seat->window,
                'aisle' => $seat->aisle,
                'available' => !$reservedIds->contains($seat->id),
            ]);

        $trip->forceFill(['available_seats' => $seats->where('available', true)->count()])->save();

        return response()->json(['data' => $seats->values()]);
    }
}
