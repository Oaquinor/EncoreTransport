<?php

use App\Http\Middleware\ApiTokenAuth;
use App\Http\Middleware\OptionalApiTokenAuth;
use App\Http\Middleware\RequirePermission;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'api.token' => ApiTokenAuth::class,
            'api.token.optional' => OptionalApiTokenAuth::class,
            'permission' => RequirePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->renderable(function (QueryException $exception, Request $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            Log::error('Database error while serving API request.', [
                'path' => $request->path(),
                'method' => $request->method(),
                'sql_state' => $exception->getCode(),
            ]);

            return response()->json([
                'message' => 'The service is temporarily unavailable. Please try again shortly.',
                'code' => 'service_unavailable',
            ], 503);
        });
    })->create();
