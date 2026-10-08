<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Models\ApiToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = User::query()->where('email', $request->string('email'))->first();
        if (!$user || !$user->active || !Hash::check($request->string('password'), $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        $plain = Str::random(80);
        $token = ApiToken::query()->create([
            'user_id' => $user->id,
            'name' => 'api',
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addDays(30),
        ]);

        return response()->json(['token' => $plain, 'token_type' => 'Bearer', 'expires_at' => $token->expires_at, 'user' => $user]);
    }

    public function me(Request $request) { return response()->json(['user' => $request->user()]); }

    public function logout(Request $request)
    {
        $request->attributes->get('api_token')?->delete();
        return response()->json(['message' => 'Logged out.']);
    }
}
