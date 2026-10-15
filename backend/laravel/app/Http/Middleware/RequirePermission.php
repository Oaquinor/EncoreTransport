<?php

namespace App\Http\Middleware;

use App\Services\Auth\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function handle(Request $request, Closure $next, string ...$required): Response
    {
        foreach ($required as $permission) {
            if ($this->permissions->allows($request->user(), $permission)) return $next($request);
        }
        return response()->json(['message' => 'Forbidden.'], 403);
    }
}
