<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

class HealthController extends Controller
{
    #[OA\Get(
        path: '/api/v1/health',
        summary: 'Verificar estado de la API',
        description: 'Comprueba que la API de EncoreTransport esté operativa.',
        tags: ['Health'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'API operativa',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'success',
                            type: 'boolean',
                            example: true
                        ),
                        new OA\Property(
                            property: 'data',
                            type: 'object',
                            properties: [
                                new OA\Property(
                                    property: 'status',
                                    type: 'string',
                                    example: 'ok'
                                )
                            ]
                        )
                    ]
                )
            )
        ]
    )]
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'status' => 'ok',
            ],
        ]);
    }
}