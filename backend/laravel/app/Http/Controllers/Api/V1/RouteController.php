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
use Illuminate\Validation\ValidationException;
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
            TransportRoute::query()->with(['stops','segments'])->orderBy('origin')->orderBy('destination')->get()
        );
    }

    public function store(Request $request, AuditService $audit)
    {
        $data = $this->validated($request);

        $route = DB::transaction(function () use ($data, $audit, $request) {
            $stops = $data['stops'] ?? [];
            $segments = $data['segments'] ?? [];
            unset($data['stops']);
            unset($data['segments']);
            $route = TransportRoute::query()->create($data);
            $this->replaceStops($route, $stops, $segments);
            $audit->record($request->user(), 'route.created', $route);
            return $route->load('stops');
        });

        return (new RouteResource($route))->response()->setStatusCode(201);
    }

    public function update(Request $request, TransportRoute $transportRoute, AuditService $audit)
    {
        $data = $this->validated($request);

        $route = DB::transaction(function () use ($data, $audit, $request, $transportRoute) {
            $hasStops = array_key_exists('stops', $data);
            $hasSegments = array_key_exists('segments', $data);
            $stops = $data['stops'] ?? [];
            $segments = $data['segments'] ?? [];
            unset($data['stops']);
            unset($data['segments']);

            $transportRoute = TransportRoute::query()->lockForUpdate()->findOrFail($transportRoute->id);
            $existingStops = $transportRoute->stops()->orderBy('sequence')->get();
            $hasTripHistory = $transportRoute->trips()->exists();
            if ($hasTripHistory) {
                if (isset($data['origin']) && strcasecmp(trim($data['origin']), trim($transportRoute->origin)) !== 0
                    || isset($data['destination']) && strcasecmp(trim($data['destination']), trim($transportRoute->destination)) !== 0) {
                    throw ValidationException::withMessages(['route' => 'Route terminals cannot change after trips or bookings exist.']);
                }
                if ($hasStops) $this->assertHistoricalStopSequence($existingStops->all(), $stops);
            } elseif (!$hasStops && $existingStops->isNotEmpty()) {
                $origin = $data['origin'] ?? $transportRoute->origin;
                $destination = $data['destination'] ?? $transportRoute->destination;
                if (strcasecmp(trim($origin), trim((string) $existingStops->first()->name)) !== 0
                    || strcasecmp(trim($destination), trim((string) $existingStops->last()->name)) !== 0) {
                    throw ValidationException::withMessages(['stops' => 'Include the full stop sequence when changing route terminals.']);
                }
            }

            $transportRoute->fill($data)->save();
            if ($hasStops) {
                $this->replaceStops($transportRoute, $stops, $segments, $hasTripHistory);
            } elseif ($hasSegments) {
                $this->updateSegments($transportRoute, $segments);
            }
            $audit->record($request->user(), 'route.updated', $transportRoute);
            return $transportRoute->fresh(['stops', 'segments']);
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
            'segments' => ['sometimes', 'array', 'max:500'],
            'segments.*.origin' => ['required_with:segments', 'string', 'max:150'],
            'segments.*.destination' => ['required_with:segments', 'string', 'max:150'],
            'segments.*.price' => ['nullable', 'integer', 'min:0'],
            'segments.*.distance_meters' => ['nullable', 'integer', 'min:0'],
            'segments.*.duration_seconds' => ['nullable', 'integer', 'min:0'],
            'segments.*.active' => ['sometimes', 'boolean'],
        ]);
    }

    private function replaceStops(TransportRoute $route, array $stops, array $segmentData = [], bool $preserveSequence = false): void
    {
        if (count($stops) < 2) {
            throw ValidationException::withMessages(['stops' => 'A route must contain at least an origin and destination stop.']);
        }

        $first = trim((string) ($stops[0]['name'] ?? ''));
        $last = trim((string) ($stops[array_key_last($stops)]['name'] ?? ''));
        if (strcasecmp($first, trim((string) $route->origin)) !== 0) {
            throw ValidationException::withMessages(['stops' => 'The first stop must match the route origin.']);
        }
        if (strcasecmp($last, trim((string) $route->destination)) !== 0) {
            throw ValidationException::withMessages(['stops' => 'The last stop must match the route destination.']);
        }

        $this->assertUniqueStopNames($stops);
        $segmentMap = $this->normalizeSegments($stops, $segmentData);

        if ($preserveSequence) {
            $existing = $route->stops()->orderBy('sequence')->get();
            $this->assertHistoricalStopSequence($existing->all(), $stops);
            $historicalStops = array_map(fn ($index, $stop) => $stop + ['sequence' => (int) $existing[$index]->sequence], array_keys(array_values($stops)), array_values($stops));
            $segmentMap = $this->normalizeSegments($historicalStops, $segmentData);
            foreach (array_values($stops) as $index => $stop) {
                $existing[$index]->forceFill([
                    'latitude' => $stop['latitude'] ?? null,
                    'longitude' => $stop['longitude'] ?? null,
                    'offset_minutes' => $stop['offset_minutes'] ?? 0,
                ])->save();
            }
            foreach ($segmentMap as $pair => $segment) {
                [$fromSequence, $toSequence] = array_map('intval', explode(':', $pair));
                $fromStop = $existing->firstWhere('sequence', $fromSequence);
                $toStop = $existing->firstWhere('sequence', $toSequence);
                RouteSegment::query()->updateOrCreate([
                    'transport_route_id' => $route->id,
                    'origin_stop_sequence' => $fromSequence,
                    'destination_stop_sequence' => $toSequence,
                ], [
                    'origin_name' => $fromStop->name,
                    'destination_name' => $toStop->name,
                    'price' => $segment['price'] ?? null,
                    'distance_meters' => $segment['distance_meters'] ?? null,
                    'duration_seconds' => $segment['duration_seconds'] ?? null,
                    'active' => $segment['active'] ?? true,
                ]);
            }
            return;
        }

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
                $segment = $segmentMap[$from->sequence.':'.$to->sequence] ?? [];
                RouteSegment::query()->create([
                    'transport_route_id' => $route->id,
                    'origin_stop_sequence' => $from->sequence,
                    'destination_stop_sequence' => $to->sequence,
                    'origin_name' => $from->name,
                    'destination_name' => $to->name,
                    'price' => $segment['price'] ?? null,
                    'distance_meters' => $segment['distance_meters'] ?? null,
                    'duration_seconds' => $segment['duration_seconds'] ?? null,
                    'active' => $segment['active'] ?? true,
                ]);
            }
        }
    }

    private function updateSegments(TransportRoute $route, array $segmentData): void
    {
        $stops = $route->stops()->orderBy('sequence')->get()->map(fn ($stop) => [
            'name' => $stop->name,
            'sequence' => (int) $stop->sequence,
        ])->all();
        $segmentMap = $this->normalizeSegments($stops, $segmentData);
        foreach ($segmentMap as $pair => $segment) {
            [$fromSequence, $toSequence] = array_map('intval', explode(':', $pair));
            $fromStop = collect($stops)->firstWhere('sequence', $fromSequence);
            $toStop = collect($stops)->firstWhere('sequence', $toSequence);
            RouteSegment::query()->updateOrCreate([
                    'transport_route_id' => $route->id,
                    'origin_stop_sequence' => $fromSequence,
                    'destination_stop_sequence' => $toSequence,
                ], [
                    'origin_name' => $fromStop['name'],
                    'destination_name' => $toStop['name'],
                    'price' => $segment['price'] ?? null,
                    'distance_meters' => $segment['distance_meters'] ?? null,
                    'duration_seconds' => $segment['duration_seconds'] ?? null,
                    'active' => $segment['active'] ?? true,
                ]);
        }
    }

    private function assertHistoricalStopSequence(array $existingStops, array $requestedStops): void
    {
        $existing = collect($existingStops)->sortBy('sequence')->values();
        if ($existing->count() !== count($requestedStops)) {
            throw ValidationException::withMessages(['stops' => 'Stop count cannot change after trips or bookings exist; preserve historical sequence references.']);
        }
        foreach (array_values($requestedStops) as $index => $stop) {
            if (strcasecmp(trim((string) $existing[$index]->name), trim((string) $stop['name'])) !== 0) {
                throw ValidationException::withMessages(['stops' => 'Stop order and names cannot change after trips or bookings exist.']);
            }
        }
    }

    private function assertUniqueStopNames(array $stops): void
    {
        $names = array_map(fn ($stop) => mb_strtolower(trim((string) $stop['name'])), $stops);
        if (count($names) !== count(array_unique($names))) {
            throw ValidationException::withMessages(['stops' => 'Stop names must be unique on a route so segment selection remains unambiguous.']);
        }
    }

    private function normalizeSegments(array $stops, array $segmentData): array
    {
        $sequenceByName = [];
        foreach (array_values($stops) as $index => $stop) {
            $sequenceByName[mb_strtolower(trim((string) $stop['name']))] = (int) ($stop['sequence'] ?? $index + 1);
        }
        $normalized = [];
        foreach ($segmentData as $segment) {
            $origin = mb_strtolower(trim((string) $segment['origin']));
            $destination = mb_strtolower(trim((string) $segment['destination']));
            $from = $sequenceByName[$origin] ?? null;
            $to = $sequenceByName[$destination] ?? null;
            if (!$from || !$to || $from >= $to) {
                throw ValidationException::withMessages(['segments' => 'Every segment must connect two stops on this route in travel order.']);
            }
            $key = $from.':'.$to;
            if (isset($normalized[$key])) {
                throw ValidationException::withMessages(['segments' => 'Duplicate route segment submitted.']);
            }
            $normalized[$key] = $segment;
        }
        return $normalized;
    }
}
