<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TransportPackage;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PackageController extends Controller
{
    private const STATUS_TRANSITIONS = [
        'received' => ['in_progress'],
        'in_progress' => ['delivered'],
        'delivered' => [],
    ];

    public function store(Request $request)
    {
        $data = $request->validate([
            'trip_id' => ['required', 'exists:trips,id'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'recipient_name' => ['required', 'string', 'max:150'],
            'recipient_phone' => ['nullable', 'string', 'max:40'],
            'recipient_email' => ['nullable', 'email', 'max:150'],
            'description' => ['nullable', 'string', 'max:3000'],
        ]);

        $driver = $request->user()?->driver;
        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        $trip = Trip::query()->whereKey($data['trip_id'])->firstOrFail();
        if ($trip->driver_id !== $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $token = Str::random(64);
        $package = DB::transaction(function () use ($data, $driver, $request, $token): TransportPackage {
            $package = TransportPackage::query()->create([
                ...$data,
                'public_id' => (string) Str::uuid(),
                'tracking_token_hash' => hash('sha256', $token),
                'driver_id' => $driver->id,
                'reference' => 'PK-' . strtoupper(Str::random(10)),
                'status' => 'received',
            ]);

            $package->events()->create([
                'user_id' => $request->user()?->id,
                'status' => 'received',
                'occurred_at' => now(),
            ]);

            return $package;
        });

        return response()->json([
            'data' => [
                'package' => $package->load('trip.route', 'trip.bus'),
                'tracking_token' => $token,
                'tracking_url' => '/track-package/?token=' . $token,
            ],
        ], 201);
    }

    public function updateStatus(Request $request, TransportPackage $package)
    {
        $data = $request->validate([
            'status' => ['required', 'in:received,in_progress,delivered'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'recipient_verified' => ['sometimes', 'boolean'],
            'delivery_photo' => ['nullable', 'image', 'max:5120'],
        ]);

        $driver = $request->user()?->driver;
        if (!$driver || $package->driver_id !== $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $updated = DB::transaction(function () use ($data, $request, $package): array {
            // Serialize retries so two requests cannot append competing custody events.
            $locked = TransportPackage::query()->lockForUpdate()->findOrFail($package->id);
            $nextStatus = $data['status'];

            if ($nextStatus === $locked->status) {
                return [$locked->fresh(['trip.route', 'events'])];
            }

            if (!in_array($nextStatus, self::STATUS_TRANSITIONS[$locked->status] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Invalid package status transition.',
                ]);
            }

            if ($nextStatus === 'delivered'
                && (!$request->boolean('recipient_verified') || !$request->hasFile('delivery_photo'))) {
                throw ValidationException::withMessages([
                    'status' => 'Delivery requires recipient verification and a delivery photo.',
                ]);
            }

            $photoPath = $request->hasFile('delivery_photo')
                ? $request->file('delivery_photo')->store('package-deliveries', 'local')
                : $locked->delivery_photo_path;

            $locked->forceFill([
                'status' => $nextStatus,
                'delivered_at' => $nextStatus === 'delivered' ? now() : $locked->delivered_at,
                'recipient_verified_at' => $nextStatus === 'delivered' ? now() : $locked->recipient_verified_at,
                'delivery_photo_path' => $photoPath,
            ])->save();

            $locked->events()->create([
                'user_id' => $request->user()?->id,
                'status' => $nextStatus,
                'notes' => $data['notes'] ?? null,
                'occurred_at' => now(),
            ]);

            return [$locked->fresh(['trip.route', 'events'])];
        });

        [$package] = $updated;
        return response()->json(['data' => $package]);
    }

    public function track(string $token)
    {
        // The public endpoint accepts only opaque tracking tokens, never IDs or emails.
        if (!preg_match('/^[A-Za-z0-9]{32,128}$/', $token)) {
            return response()->json(['message' => 'Tracking reference not found.'], 404);
        }

        $package = TransportPackage::query()
            ->with(['trip.route', 'events' => fn ($query) => $query->orderBy('occurred_at')])
            ->where('tracking_token_hash', hash('sha256', $token))
            ->first();

        if (!$package) {
            return response()->json(['message' => 'Tracking reference not found.'], 404);
        }

        $events = $package->events->map(fn ($event) => [
            'status' => $event->status,
            'occurred_at' => $event->occurred_at,
        ])->values();

        return response()->json(['data' => [
            'reference' => $package->reference,
            'status' => $package->status,
            'route' => $package->trip?->route?->origin && $package->trip?->route?->destination
                ? $package->trip->route->origin . ' → ' . $package->trip->route->destination
                : null,
            'created_at' => $package->created_at,
            'last_updated_at' => $events->last()['occurred_at'] ?? $package->created_at,
            'delivered_at' => $package->delivered_at,
            'next_action' => $this->nextAction($package->status),
            'events' => $events,
        ]]);
    }

    public function index(Request $request)
    {
        $query = TransportPackage::query()->with(['trip.route', 'trip.bus', 'driver'])->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->limit(300)->get()]);
    }

    private function nextAction(string $status): string
    {
        return match ($status) {
            'received' => 'Awaiting loading or departure confirmation.',
            'in_progress' => 'Awaiting arrival and recipient verification.',
            'delivered' => 'No further action is required.',
            default => 'Contact Encore Transport for assistance.',
        };
    }
}
