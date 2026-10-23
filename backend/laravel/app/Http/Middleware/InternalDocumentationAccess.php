<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps generated API documentation out of public production traffic.
 */
class InternalDocumentationAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('production') && ! config('l5-swagger.public', false)) {
            abort(404);
        }

        return $next($request);
    }
}
