<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Models\ApiToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    #[OA\Post(
        path: '/api/v1/auth/login',
        operationId: 'login',
        summary: 'Iniciar sesion',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'passenger@example.test'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', example: 'password'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Sesion iniciada',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'token', type: 'string'),
                        new OA\Property(property: 'token_type', type: 'string', example: 'Bearer'),
                        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time'),
                        new OA\Property(property: 'user', ref: '#/components/schemas/User'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Credenciales invalidas', content: new OA\JsonContent(ref: '#/components/schemas/ApiError')),
        ]
    )]
    public function login(LoginRequest $request)
    {
        $user = User::query()->where('email', $request->input('email'))->first();

        if (!$user || !$user->active || !Hash::check((string) $request->input('password'), $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        $plain = Str::random(80);
        $token = ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'api',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addDays(30),
        ]);

        return response()->json([
            'token' => $plain,
            'token_type' => 'Bearer',
            'expires_at' => $token->expires_at,
            'user' => $user,
        ]);
    }

    #[OA\Get(
        path: '/api/v1/auth/me',
        operationId: 'authenticatedUser',
        summary: 'Consultar usuario autenticado',
        tags: ['Authentication'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Usuario autenticado',
                content: new OA\JsonContent(properties: [new OA\Property(property: 'user', ref: '#/components/schemas/User')])
            ),
            new OA\Response(response: 401, description: 'No autenticado', content: new OA\JsonContent(ref: '#/components/schemas/ApiError')),
        ]
    )]
    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }

    #[OA\Post(
        path: '/api/v1/auth/logout',
        operationId: 'logout',
        summary: 'Cerrar sesion actual',
        tags: ['Authentication'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Sesion cerrada'),
            new OA\Response(response: 401, description: 'No autenticado'),
        ]
    )]
    public function logout(Request $request)
    {
        $request->attributes->get('api_token')?->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
