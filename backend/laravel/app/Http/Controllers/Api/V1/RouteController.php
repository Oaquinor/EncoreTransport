<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\RouteResource;
use App\Models\RouteStop;
use App\Models\TransportRoute;
use App\Models\RouteSegment;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class RouteController extends Controller
{
    #[OA\Get(path:'/api/v1/routes',operationId:'listRoutes',summary:'Listar rutas activas',tags:['Routes'],responses:[new OA\Response(response:200,description:'Rutas')])]
    public function index()
    {
        return RouteResource::collection(TransportRoute::query()->where('active',true)->with(['stops','segments'])->orderBy('origin')->orderBy('destination')->get());
    }

    public function show(TransportRoute $transportRoute)
    {
        if (!$transportRoute->active) abort(404);
        return new RouteResource($transportRoute->load(['stops','segments']));
    }

    public function adminIndex()
    {
        return RouteResource::collection(
            TransportRoute::query()->with('stops')->orderBy('origin')->orderBy('destination')->get()
        );
    }

    public function store(Request $request, AuditService $audit)
    {
        $data = $this->validated($request);

        $route = DB::transaction(function () use ($data, $audit, $request) {
            $stops = $data['stops'] ?? [];
            unset($data['stops']);
            $route = TransportRoute::query()->create($data);
            $this->replaceStops($route, $stops);
            $audit->record($request->user(), 'route.created', $route);
            return $route->load('stops');
        });

        return (new RouteResource($route))->response()->setStatusCode(201);
    }

    public function update(Request $request, TransportRoute $transportRoute, AuditService $audit)
    {
        $data = $this->validated($request);

        $route = DB::transaction(function () use ($data, $audit, $request, $transportRoute) {
            $stops = $data['stops'] ?? [];
            unset($data['stops']);
            $transportRoute->fill($data)->save();
            $this->replaceStops($transportRoute, $stops);
            $audit->record($request->user(), 'route.updated', $transportRoute);
            return $transportRoute->fresh('stops');
        });

        return new RouteResource($route);
    }

    public function deactivate(Request $request, TransportRoute $transportRoute, AuditService $audit)
    {
        $transportRoute->update(['active' => false]);
        $audit->record($request->user(), 'route.deactivated', $transportRoute);

        return new RouteResource($transportRoute->fresh('stops'));
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'origin' => ['required', 'string', 'max:150'],
            'destination' => ['required', 'string', 'max:150', 'different:origin'],
            'distance_km' => ['required', 'integer', 'min:0', 'max:100000'],
            'origin_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'origin_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'destination_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'destination_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'distance_meters' => ['nullable', 'integer', 'min:0'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'route_geometry' => ['nullable', 'array'],
            'active' => ['sometimes', 'boolean'],
            'stops' => ['sometimes', 'array', 'max:100'],
            'stops.*.name' => ['required_with:stops', 'string', 'max:150'],
            'stops.*.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'stops.*.longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'stops.*.offset_minutes' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]);
    }

    private function replaceStops(TransportRoute $route, array $stops): void
    {
        $route->stops()->delete();
        foreach (array_values($stops) as $index => $stop) {
            RouteStop::query()->create([
                'transport_route_id' => $route->id,
                'sequence' => $index + 1,
                'name' => $stop['name'],
                'latitude' => $stop['latitude'] ?? null,
                'longitude' => $stop['longitude'] ?? null,
                'offset_minutes' => $stop['offset_minutes'] ?? 0,
            ]);
        }
        $ordered = $route->stops()->orderBy('sequence')->get();
        $route->segments()->delete();
        foreach ($ordered as $fromIndex => $from) {
            foreach ($ordered->slice($fromIndex + 1) as $to) {
                RouteSegment::query()->create([
                    'transport_route_id' => $route->id,
                    'origin_stop_sequence' => $from->sequence,
                    'destination_stop_sequence' => $to->sequence,
                    'origin_name' => $from->name,
                    'destination_name' => $to->name,
                ]);
            }
        }
    }
}
