<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreBookingRequest;
use App\Models\Booking;
use App\Services\Bookings\BookingService;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function store(StoreBookingRequest $request, BookingService $service)
    {
        $booking = $service->create($request->validated(), $request->user()?->id);
        return response()->json(['data' => $booking], 201);
    }

    public function show(Request $request, Booking $booking)
    {
        if ($booking->user_id && $request->user()?->id !== $booking->user_id && $request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        return response()->json(['data' => $booking->load(['trip.route','reservedSeats.seat','passengers'])]);
    }
}
