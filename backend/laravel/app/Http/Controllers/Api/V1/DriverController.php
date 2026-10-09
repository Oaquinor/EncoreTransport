<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Trip;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class DriverController extends Controller
{
    #[OA\Get(
        path: '/api/v1/driver/me',
        operationId: 'driverProfile',
        summary: 'Authenticated driver profile',
        tags: ['Drivers'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Driver'),
            new OA\Response(response: 404, description: 'Driver profile not found'),
        ]
    )]
    public function profile(Request $request)
    {
        $driver = $request->user()?->driver;
        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        return response()->json(['data' => $driver->load('user')]);
    }

    #[OA\Get(
        path: '/api/v1/driver/trips/current',
        operationId: 'driverCurrentTrip',
        summary: 'Current or next assigned trip',
        tags: ['Drivers'],
        security: [['bearerAuth' => []]],
        responses: [new OA\Response(response: 200, description: 'Trip or null')]
    )]
    public function currentTrip(Request $request)
    {
        $driver = $request->user()?->driver;
        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        $trip = Trip::query()
            ->with(['route', 'bus', 'driver'])
            ->where('driver_id', $driver->id)
            ->whereIn('status', ['scheduled', 'boarding', 'in_progress'])
            ->orderByRaw("FIELD(status, 'in_progress', 'boarding', 'scheduled')")
            ->orderBy('departure_date')
            ->orderBy('departure_time')
            ->first();

        return $trip ? new TripResource($trip) : response()->json(['data' => null]);
    }
}
