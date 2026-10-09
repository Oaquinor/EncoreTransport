<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Models\Trip;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class IncidentController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    #[OA\Post(
        path: '/api/v1/driver/incidents',
        operationId: 'createDriverIncident',
        summary: 'Create trip incident',
        tags: ['Incidents'],
        security: [['bearerAuth' => []]],
        responses: [new OA\Response(response: 201, description: 'Incident')]
    )]
    public function store(Request $request)
    {
        $data = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'title' => ['required', 'string', 'max:120'],
            'description' => ['required', 'string', 'max:5000'],
            'severity' => ['nullable', 'in:low,medium,high'],
        ]);

        $driver = $request->user()?->driver;
        $trip = Trip::query()->findOrFail($data['trip_id']);

        if ($request->user()?->role !== 'admin' && (!$driver || $trip->driver_id !== $driver->id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $incident = Incident::query()->create([
            ...$data,
            'severity' => $data['severity'] ?? 'medium',
            'driver_id' => $driver?->id,
            'reported_by_user_id' => $request->user()?->id,
            'status' => 'open',
        ]);

        $this->audit->record($request->user(), 'incident.created', $incident, ['trip_id' => $trip->id]);

        return response()->json(['data' => $incident], 201);
    }

    #[OA\Get(
        path: '/api/v1/admin/incidents',
        operationId: 'listIncidents',
        summary: 'List incidents',
        tags: ['Incidents'],
        security: [['bearerAuth' => []]],
        responses: [new OA\Response(response: 200, description: 'Incidents')]
    )]
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:open,in_progress,resolved,dismissed'],
            'severity' => ['nullable', 'in:low,medium,high'],
        ]);

        $items = Incident::query()
            ->with(['trip.route', 'driver'])
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($data['severity'] ?? null, fn ($q, $severity) => $q->where('severity', $severity))
            ->latest()
            ->limit(200)
            ->get();

        return response()->json(['data' => $items]);
    }

    #[OA\Patch(
        path: '/api/v1/admin/incidents/{incident}',
        operationId: 'updateIncident',
        summary: 'Update incident status or severity',
        tags: ['Incidents'],
        security: [['bearerAuth' => []]],
        parameters: [new OA\Parameter(name: 'incident', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [new OA\Response(response: 200, description: 'Incident updated')]
    )]
    public function update(Request $request, Incident $incident)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:open,in_progress,resolved,dismissed'],
            'severity' => ['nullable', 'in:low,medium,high'],
            'title' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        if (($data['status'] ?? null) === 'resolved' && $incident->status !== 'resolved') {
            $data['resolved_at'] = now();
        } elseif (isset($data['status']) && $data['status'] !== 'resolved') {
            $data['resolved_at'] = null;
        }

        $before = $incident->only(['status', 'severity', 'title']);
        $incident->fill($data)->save();
        $this->audit->record($request->user(), 'incident.updated', $incident, ['before' => $before]);

        return response()->json(['data' => $incident->fresh(['trip.route', 'driver'])]);
    }
}
