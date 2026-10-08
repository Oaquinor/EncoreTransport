<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreBookingRequest;
use App\Models\Booking;
use App\Services\Bookings\BookingService;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class BookingController extends Controller
{
    #[OA\Post(
        path: '/api/v1/bookings',
        operationId: 'createBooking',
        summary: 'Crear una reserva y retener asientos',
        description: 'La reserva se ejecuta dentro de una transaccion y protege contra doble reserva concurrente.',
        tags: ['Bookings'],
        security: [['bearerAuth' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['trip_id', 'seat_ids', 'passengers'],
                properties: [
                    new OA\Property(property: 'trip_id', type: 'integer', example: 1),
                    new OA\Property(property: 'seat_ids', type: 'array', items: new OA\Items(type: 'integer'), example: [1, 2]),
                    new OA\Property(
                        property: 'passengers',
                        type: 'array',
                        items: new OA\Items(ref: '#/components/schemas/BookingPassengerInput')
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Reserva creada',
                content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Booking')])
            ),
            new OA\Response(response: 401, description: 'No autenticado'),
            new OA\Response(response: 422, description: 'Reserva invalida o asiento no disponible', content: new OA\JsonContent(ref: '#/components/schemas/ApiError')),
        ]
    )]
    public function store(StoreBookingRequest $request, BookingService $service)
    {
        $booking = $service->create($request->validated(), $request->user()?->id);

        return response()->json(['data' => $booking], 201);
    }

    #[OA\Get(
        path: '/api/v1/bookings/{booking}',
        operationId: 'getBooking',
        summary: 'Consultar una reserva',
        tags: ['Bookings'],
        security: [['bearerAuth' => []]],
        parameters: [new OA\Parameter(name: 'booking', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Detalle de la reserva',
                content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Booking')])
            ),
            new OA\Response(response: 401, description: 'No autenticado'),
            new OA\Response(response: 403, description: 'Sin permiso'),
            new OA\Response(response: 404, description: 'Reserva no encontrada'),
        ]
    )]
    public function show(Request $request, Booking $booking)
    {
        if ($booking->user_id && $request->user()?->id !== $booking->user_id && $request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'data' => $booking->load(['trip.route', 'reservedSeats.seat', 'passengers']),
        ]);
    }
}
