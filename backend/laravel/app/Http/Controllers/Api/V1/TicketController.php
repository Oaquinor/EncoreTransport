<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Ticket;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class TicketController extends Controller
{
    #[OA\Get(path:'/api/v1/bookings/{booking}/ticket',operationId:'bookingTicket',summary:'Consultar ticket emitido',tags:['Tickets'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Ticket'),new OA\Response(response:404,description:'No emitido')])]
    public function show(Request $request, Booking $booking)
    {
        if ($booking->user_id !== $request->user()?->id && $request->user()?->role !== 'admin') abort(403);
        $ticket = Ticket::query()->where('booking_id',$booking->id)->first();
        if (!$ticket) return response()->json(['message'=>'Ticket has not been issued.'],404);
        return response()->json(['data'=>$ticket->load('booking.trip.route')]);
    }
}
