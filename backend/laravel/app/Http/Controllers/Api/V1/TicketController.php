<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Ticket;
use App\Services\Tickets\TicketService;
use App\Services\Bookings\GuestBookingAccess;
use App\Services\Auth\PermissionService;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;

class TicketController extends Controller
{
    public function __construct(private readonly PermissionService $permissions) {}

    #[OA\Get(
        path: '/api/v1/bookings/{booking}/ticket',
        operationId: 'bookingTicket',
        summary: 'Get issued ticket',
        tags: ['Tickets'],
        security: [['bearerAuth' => []]],
        parameters: [new OA\Parameter(name: 'booking', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Ticket'),
            new OA\Response(response: 404, description: 'Not issued'),
        ]
    )]
    public function show(Request $request, Booking $booking, GuestBookingAccess $guestAccess)
    {
        $isOwner = $booking->user_id !== null && $booking->user_id === $request->user()?->id;
        $canViewTickets = $this->permissions->allows($request->user(), 'tickets.view');
        if (!$isOwner && !$canViewTickets && !$guestAccess->matches($request, $booking)) {
            abort(403);
        }

        $ticket = Ticket::query()->where('booking_id', $booking->id)->first();
        if (!$ticket) {
            return response()->json(['message' => 'Ticket has not been issued.'], 404);
        }

        return response()->json(['data' => $ticket->load('booking.trip.route')]);
    }

    #[OA\Post(
        path: '/api/v1/tickets/validate',
        operationId: 'validateTicket',
        summary: 'Validate and consume a ticket QR token',
        tags: ['Tickets'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Ticket validated'),
            new OA\Response(response: 409, description: 'Ticket invalid, unavailable or already used'),
        ]
    )]
    public function validateTicket(Request $request, TicketService $service)
    {
        $data = $request->validate([
            'public_id' => ['required', 'uuid'],
            'token' => ['required', 'string', 'min:32', 'max:255'],
        ]);

        try {
            $ticket = $service->validateToken($data['public_id'], $data['token'], $request->user());
            return response()->json(['data' => $ticket]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }
    }
}
