<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Trip;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class TripController extends Controller
{
    #[OA\Get(
        path: '/api/v1/trips/search',
        operationId: 'searchTrips',
        summary: 'Buscar viajes disponibles',
        tags: ['Trips'],
        parameters: [
            new OA\Parameter(name: 'origin', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'destination', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'date', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'passengers', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 10, default: 1)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Viajes encontrados',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Trip')),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Parametros invalidos', content: new OA\JsonContent(ref: '#/components/schemas/ApiError')),
        ]
    )]
    public function search(Request $request)
    {
        $filters = $request->validate([
            'origin' => ['nullable', 'string', 'max:150'],
            'destination' => ['nullable', 'string', 'max:150'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'passengers' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $passengers = (int) ($filters['passengers'] ?? 1);

        $trips = Trip::query()
            ->with(['route', 'bus', 'driver'])
            ->whereIn('status', ['scheduled', 'boarding'])
            ->when($filters['origin'] ?? null, function ($query, $origin) {
                $query->whereHas('route', fn ($routeQuery) => $routeQuery->where('origin', 'like', '%'.$origin.'%'));
            })
            ->when($filters['destination'] ?? null, function ($query, $destination) {
                $query->whereHas('route', fn ($routeQuery) => $routeQuery->where('destination', 'like', '%'.$destination.'%'));
            })
            ->when($filters['date'] ?? null, fn ($query, $date) => $query->whereDate('departure_date', $date))
            ->where('available_seats', '>=', $passengers)
            ->orderBy('departure_date')
            ->orderBy('departure_time')
            ->get();

        return TripResource::collection($trips);
    }

    #[OA\Get(
        path: '/api/v1/trips/{trip}',
        operationId: 'getTrip',
        summary: 'Consultar un viaje',
        tags: ['Trips'],
        parameters: [new OA\Parameter(name: 'trip', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Detalle del viaje', content: new OA\JsonContent(ref: '#/components/schemas/Trip')),
            new OA\Response(response: 404, description: 'Viaje no encontrado'),
        ]
    )]
    public function show(Trip $trip)
    {
        return new TripResource($trip->load(['route', 'bus', 'driver']));
    }
}
