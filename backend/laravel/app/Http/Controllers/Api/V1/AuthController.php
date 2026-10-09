<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Models\ApiToken;
use App\Models\User;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    #[OA\Post(
        path: '/api/v1/auth/register',
        operationId: 'registerPassenger',
        summary: 'Register passenger account',
        tags: ['Authentication'],
        responses: [
            new OA\Response(response: 201, description: 'Account created'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => mb_strtolower($data['email']),
            'phone' => $data['phone'] ?? null,
            'role' => 'passenger',
            'active' => true,
            'password' => Hash::make($data['password']),
        ]);

        [$plain, $token] = $this->createToken($user);
        $this->audit->record($user, 'auth.register', $user);

        return response()->json($this->authPayload($user, $plain, $token), 201);
    }

    #[OA\Post(
        path: '/api/v1/auth/login',
        operationId: 'login',
        summary: 'Sign in',
        tags: ['Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Authenticated'),
            new OA\Response(response: 422, description: 'Invalid credentials'),
        ]
    )]
    public function login(LoginRequest $request)
    {
        $user = User::query()->where('email', mb_strtolower((string) $request->input('email')))->first();

        if (!$user || !$user->active || !Hash::check((string) $request->input('password'), $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        [$plain, $token] = $this->createToken($user);
        $this->audit->record($user, 'auth.login', $token);

        return response()->json($this->authPayload($user, $plain, $token));
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }

    public function logout(Request $request)
    {
        $token = $request->attributes->get('api_token');
        $this->audit->record($request->user(), 'auth.logout', $token);
        $token?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    private function createToken(User $user): array
    {
        $plain = Str::random(80);
        $token = ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'api',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addDays(30),
        ]);

        return [$plain, $token];
    }

    private function authPayload(User $user, string $plain, ApiToken $token): array
    {
        return [
            'token' => $plain,
            'token_type' => 'Bearer',
            'expires_at' => $token->expires_at,
            'user' => $user,
        ];
    }
}
