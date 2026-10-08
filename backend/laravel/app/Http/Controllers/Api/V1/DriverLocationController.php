<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DriverLocation;
use App\Models\Trip;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class DriverLocationController extends Controller
{
    #[OA\Post(
        path: '/api/v1/driver/locations',
        operationId: 'storeDriverLocation',
        summary: 'Registrar ubicacion GPS del conductor',
        tags: ['Tracking'],
        security: [['bearerAuth' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['trip_id', 'latitude', 'longitude', 'recorded_at'],
                properties: [
                    new OA\Property(property: 'trip_id', type: 'integer', example: 1),
                    new OA\Property(property: 'latitude', type: 'number', format: 'double', example: 18.4861),
                    new OA\Property(property: 'longitude', type: 'number', format: 'double', example: -69.9312),
                    new OA\Property(property: 'heading', type: 'number', format: 'double', nullable: true, example: 90),
                    new OA\Property(property: 'speed_kph', type: 'number', format: 'double', nullable: true, example: 55),
                    new OA\Property(property: 'recorded_at', type: 'string', format: 'date-time', example: '2026-10-08T02:30:00-04:00'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Ubicacion registrada',
                content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/DriverLocation')])
            ),
            new OA\Response(response: 401, description: 'No autenticado'),
            new OA\Response(response: 403, description: 'Rol no permitido'),
            new OA\Response(response: 422, description: 'Datos invalidos'),
        ]
    )]
    public function store(Request $request)
    {
        $data = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'heading' => ['nullable', 'numeric', 'between:0,360'],
            'speed_kph' => ['nullable', 'numeric', 'min:0', 'max:250'],
            'recorded_at' => ['required', 'date'],
        ]);

        $driver = $request->user()?->driver;

        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 422);
        }

        $trip = Trip::query()->findOrFail($data['trip_id']);
        if ($trip->driver_id !== $driver->id && $request->user()?->role !== 'admin') {
            return response()->json(['message' => 'This trip is not assigned to the authenticated driver.'], 403);
        }

        $location = DriverLocation::query()->create($data + ['driver_id' => $driver->id]);

        return response()->json(['data' => $location], 201);
    }

    #[OA\Get(
        path: '/api/v1/trips/{trip}/location',
        operationId: 'latestTripLocation',
        summary: 'Consultar ultima ubicacion conocida del vehiculo',
        tags: ['Tracking'],
        parameters: [new OA\Parameter(name: 'trip', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Ultima ubicacion o null',
                content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/DriverLocation', nullable: true)])
            ),
        ]
    )]
    public function latest(Trip $trip)
    {
        $location = DriverLocation::query()
            ->where('trip_id', $trip->id)
            ->latest('recorded_at')
            ->first();

        return response()->json(['data' => $location]);
    }
}
