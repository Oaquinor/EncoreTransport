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
        summary: 'Consultar perfil del conductor autenticado',
        tags: ['Drivers'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Perfil del conductor'),
            new OA\Response(response: 401, description: 'No autenticado'),
            new OA\Response(response: 403, description: 'Rol no permitido'),
            new OA\Response(response: 404, description: 'Perfil de conductor no encontrado'),
        ]
    )]
    public function profile(Request $request)
    {
        $driver = $request->user()?->driver;

        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $driver->load('user'),
        ]);
    }

    #[OA\Get(
        path: '/api/v1/driver/trips/current',
        operationId: 'driverCurrentTrip',
        summary: 'Consultar viaje actual o proximo del conductor',
        tags: ['Drivers'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Viaje actual o null'),
            new OA\Response(response: 401, description: 'No autenticado'),
            new OA\Response(response: 403, description: 'Rol no permitido'),
        ]
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
            ->orderBy('departure_date')
            ->orderBy('departure_time')
            ->first();

        if (!$trip) {
            return response()->json(['data' => null]);
        }

        return new TripResource($trip);
    }
}
