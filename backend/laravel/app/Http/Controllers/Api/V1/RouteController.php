<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\RouteResource;
use App\Models\TransportRoute;
use OpenApi\Attributes as OA;

class RouteController extends Controller
{
    #[OA\Get(
        path: '/api/v1/routes',
        operationId: 'listRoutes',
        summary: 'Listar rutas activas',
        tags: ['Routes'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Listado de rutas',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: '#/components/schemas/TransportRoute')
                        ),
                    ]
                )
            ),
        ]
    )]
    public function index()
    {
        return RouteResource::collection(
            TransportRoute::query()->where('active', true)->orderBy('origin')->orderBy('destination')->get()
        );
    }
}
