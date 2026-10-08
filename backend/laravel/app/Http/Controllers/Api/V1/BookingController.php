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
    #[OA\Get(path: '/api/v1/bookings', operationId: 'listMyBookings', summary: 'Listar reservas del usuario autenticado', tags: ['Bookings'], security: [['bearerAuth'=>[]]], responses: [new OA\Response(response: 200, description: 'Reservas del usuario')])]
    public function index(Request $request)
    {
        $query = Booking::query()->with(['trip.route','trip.bus','reservedSeats.seat','passengers'])->latest();
        if ($request->user()?->role !== 'admin') $query->where('user_id', $request->user()?->id);
        return response()->json(['data' => $query->get()]);
    }

    #[OA\Post(path: '/api/v1/bookings', operationId: 'createBooking', summary: 'Crear reserva y retener asientos', tags: ['Bookings'], security: [['bearerAuth'=>[]]], responses: [new OA\Response(response: 201, description: 'Reserva creada'), new OA\Response(response: 422, description: 'Reserva invalida')])]
    public function store(StoreBookingRequest $request, BookingService $service)
    {
        $booking = $service->create($request->validated(), $request->user()?->id);
        return response()->json(['data' => $booking], 201);
    }

    #[OA\Get(path: '/api/v1/bookings/{booking}', operationId: 'getBooking', summary: 'Consultar reserva', tags: ['Bookings'], security: [['bearerAuth'=>[]]], parameters: [new OA\Parameter(name:'booking',in:'path',required:true,schema:new OA\Schema(type:'integer'))], responses: [new OA\Response(response:200,description:'Reserva'),new OA\Response(response:403,description:'Sin permiso')])]
    public function show(Request $request, Booking $booking)
    {
        $this->assertOwnership($request, $booking);
        return response()->json(['data' => $booking->load(['trip.route','trip.bus','trip.driver','reservedSeats.seat','passengers','payments','ticket'])]);
    }

    #[OA\Post(path: '/api/v1/bookings/{booking}/cancel', operationId: 'cancelBooking', summary: 'Cancelar reserva sin pagar', tags: ['Bookings'], security: [['bearerAuth'=>[]]], parameters: [new OA\Parameter(name:'booking',in:'path',required:true,schema:new OA\Schema(type:'integer'))], responses: [new OA\Response(response:200,description:'Reserva cancelada'),new OA\Response(response:422,description:'Estado invalido')])]
    public function cancel(Request $request, Booking $booking, BookingService $service)
    {
        $this->assertOwnership($request, $booking);
        return response()->json(['data' => $service->cancel($booking, $request->user())]);
    }

    private function assertOwnership(Request $request, Booking $booking): void
    {
        if ($booking->user_id && $request->user()?->id !== $booking->user_id && $request->user()?->role !== 'admin') abort(403, 'Forbidden.');
    }
}
