<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $plain = $request->bearerToken();
        if (!$plain) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $token = ApiToken::query()
            ->with('user')
            ->where('token_hash', hash('sha256', $plain))
            ->first();

        if (!$token || !$token->user || !$token->user->active || ($token->expires_at && $token->expires_at->isPast())) {
            return response()->json(['message' => 'Invalid or expired token.'], 401);
        }

        if ($roles && !in_array($token->user->role, $roles, true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $token->forceFill(['last_used_at' => now()])->save();
        $request->setUserResolver(fn () => $token->user);
        $request->attributes->set('api_token', $token);

        return $next($request);
    }
}
