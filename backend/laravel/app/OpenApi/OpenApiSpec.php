<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'EncoreTransport API',
    description: 'API REST de EncoreTransport',
    contact: new OA\Contact(
        name: 'EncoreTransport'
    )
)]
#[OA\Server(
    url: 'http://127.0.0.1:8000',
    description: 'Servidor local'
)]
#[OA\SecurityScheme(
    securityScheme: 'bearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Bearer Token'
)]
class OpenApiSpec
{
}