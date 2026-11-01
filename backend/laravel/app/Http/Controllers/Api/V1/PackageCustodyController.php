<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PackageManifest;
use App\Models\PackageManifestItem;
use App\Models\PackageTransfer;
use App\Models\TransportPackage;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PackageCustodyController extends Controller
{
    public function qr(Request $request, TransportPackage $package)
    {
        $driver = $this->driver($request);
        if (!$driver || $package->driver_id !== $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $payload = DB::transaction(function () use ($package): array {
            $locked = TransportPackage::query()->lockForUpdate()->findOrFail($package->id);
            $token = null;
            if (!$locked->qr_token_hash || !$locked->qr_payload) {
                $token = Str::random(64);
                $locked->forceFill([
                    'qr_token_hash' => hash('sha256', $token),
                    'qr_payload' => json_encode([
                        'type' => 'encore.package',
                        'package' => $locked->public_id,
                        'reference' => $locked->reference,
                        'token' => $token,
                    ], JSON_THROW_ON_ERROR),
                ])->save();
            }

            return [
                'package' => $locked->public_id,
                'reference' => $locked->reference,
                'payload' => json_decode($locked->qr_payload, true, 512, JSON_THROW_ON_ERROR),
            ];
        });

        return response()->json(['data' => $payload]);
    }

    public function scan(Request $request)
    {
        $data = $request->validate(['qr_token' => ['required', 'string', 'min:32', 'max:128']]);
        $driver = $this->driver($request);
        $package = TransportPackage::query()->with(['trip.route', 'driver', 'events', 'transfers'])
            ->where('qr_token_hash', hash('sha256', $data['qr_token']))->first();

        if (!$driver || !$package || $package->driver_id !== $driver->id) {
            return response()->json(['message' => 'Package QR not found.'], 404);
        }

        return response()->json(['data' => $this->packagePayload($package)]);
    }

    public function discrepancy(Request $request, TransportPackage $package)
    {
        $data = $request->validate(['type' => ['required', 'string', 'max:80'], 'notes' => ['required', 'string', 'max:2000']]);
        $driver = $this->driver($request);
        if (!$driver || $package->driver_id !== $driver->id) return response()->json(['message' => 'Forbidden.'], 403);

        $event = DB::transaction(function () use ($data, $request, $package) {
            $locked = TransportPackage::query()->lockForUpdate()->findOrFail($package->id);
            return $locked->events()->create(['user_id' => $request->user()?->id, 'status' => 'discrepancy', 'notes' => $data['type'] . ': ' . $data['notes'], 'occurred_at' => now()]);
        });

        return response()->json(['data' => $event], 201);
    }

    public function createManifest(Request $request)
    {
        $data = $request->validate([
            'trip_id' => ['required', 'exists:trips,id'],
            'package_ids' => ['required', 'array', 'min:1', 'max:300'],
            'package_ids.*' => ['integer', 'distinct', 'exists:packages,id'],
        ]);
        $driver = $this->driver($request);
        $trip = Trip::query()->findOrFail($data['trip_id']);
        if (!$driver || $trip->driver_id !== $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $manifest = DB::transaction(function () use ($data, $driver, $request, $trip): PackageManifest {
            $packages = TransportPackage::query()->lockForUpdate()->whereIn('id', $data['package_ids'])->get();
            if ($packages->count() !== count($data['package_ids']) || $packages->contains(fn ($package) => $package->driver_id !== $driver->id || $package->trip_id !== $trip->id)) {
                throw ValidationException::withMessages(['package_ids' => 'Every package must belong to the selected driver and trip.']);
            }

            $manifest = PackageManifest::query()->create([
                'public_id' => (string) Str::uuid(),
                'trip_id' => $trip->id,
                'driver_id' => $driver->id,
                'created_by_user_id' => $request->user()?->id,
                'reference' => 'MF-' . strtoupper(Str::random(10)),
                'status' => 'draft',
                'expected_count' => $packages->count(),
            ]);

            foreach ($packages as $package) {
                $manifest->items()->create(['package_id' => $package->id]);
                $package->events()->create([
                    'user_id' => $request->user()?->id,
                    'status' => 'manifest_created',
                    'notes' => $manifest->reference,
                    'occurred_at' => now(),
                ]);
            }

            return $manifest;
        });

        return response()->json(['data' => $manifest->load('items.package', 'trip.route')], 201);
    }

    public function showManifest(Request $request, PackageManifest $manifest)
    {
        $driver = $this->driver($request);
        if (!$driver || $manifest->driver_id !== $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(['data' => $manifest->load('items.package', 'trip.route')]);
    }

    public function scanManifest(Request $request, PackageManifest $manifest)
    {
        $data = $request->validate(['qr_token' => ['required', 'string', 'min:32', 'max:128']]);
        $driver = $this->driver($request);
        if (!$driver || $manifest->driver_id !== $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $result = DB::transaction(function () use ($data, $driver, $manifest, $request): PackageManifest {
            $locked = PackageManifest::query()->lockForUpdate()->findOrFail($manifest->id);
            if ($locked->status === 'reconciled') {
                throw ValidationException::withMessages(['manifest' => 'A reconciled manifest cannot be changed.']);
            }

            $package = TransportPackage::query()->lockForUpdate()->where('qr_token_hash', hash('sha256', $data['qr_token']))->first();
            if (!$package || $package->driver_id !== $driver->id || $package->trip_id !== $locked->trip_id) {
                throw ValidationException::withMessages(['qr_token' => 'The package does not belong to this manifest trip.']);
            }

            $item = PackageManifestItem::query()->where('manifest_id', $locked->id)->where('package_id', $package->id)->lockForUpdate()->first();
            if (!$item) {
                throw ValidationException::withMessages(['qr_token' => 'The package is not listed on this manifest.']);
            }

            if ($item->status !== 'scanned') {
                $item->forceFill(['status' => 'scanned', 'scanned_by_user_id' => $request->user()?->id, 'scanned_at' => now()])->save();
                $locked->increment('scanned_count');
                $package->events()->create([
                    'user_id' => $request->user()?->id,
                    'status' => 'manifest_scanned',
                    'notes' => $locked->reference,
                    'occurred_at' => now(),
                ]);
            }

            if ($locked->status === 'draft') {
                $locked->update(['status' => 'scanning']);
            }

            return $locked->fresh(['items.package', 'trip.route']);
        });

        return response()->json(['data' => $result]);
    }

    public function reconcileManifest(Request $request, PackageManifest $manifest)
    {
        $driver = $this->driver($request);
        if (!$driver || $manifest->driver_id !== $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $result = DB::transaction(function () use ($manifest, $request): PackageManifest {
            $locked = PackageManifest::query()->with('items.package')->lockForUpdate()->findOrFail($manifest->id);
            $missing = $locked->items->where('status', '!=', 'scanned');
            if ($missing->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'manifest' => 'Manifest cannot be reconciled while packages are missing.',
                    'missing_package_ids' => $missing->pluck('package_id')->values()->all(),
                ]);
            }

            $locked->forceFill(['status' => 'reconciled', 'scanned_count' => $locked->expected_count, 'reconciled_at' => now()])->save();
            foreach ($locked->items as $item) {
                $item->package->events()->create([
                    'user_id' => $request->user()?->id,
                    'status' => 'manifest_reconciled',
                    'notes' => $locked->reference,
                    'occurred_at' => now(),
                ]);
            }

            return $locked->fresh(['items.package', 'trip.route']);
        });

        return response()->json(['data' => $result]);
    }

    public function requestTransfer(Request $request, TransportPackage $package)
    {
        $data = $request->validate([
            'to_driver_id' => ['required', 'exists:drivers,id'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $driver = $this->driver($request);
        if (!$driver || $package->driver_id !== $driver->id || (int) $data['to_driver_id'] === (int) $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $transfer = DB::transaction(function () use ($data, $driver, $request, $package): PackageTransfer {
            $locked = TransportPackage::query()->lockForUpdate()->findOrFail($package->id);
            $pending = PackageTransfer::query()->where('package_id', $locked->id)->where('status', 'pending')->exists();
            if ($pending) {
                throw ValidationException::withMessages(['to_driver_id' => 'A transfer is already pending for this package.']);
            }

            $transfer = PackageTransfer::query()->create([
                'package_id' => $locked->id,
                'from_driver_id' => $driver->id,
                'to_driver_id' => $data['to_driver_id'],
                'requested_by_user_id' => $request->user()?->id,
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'requested_at' => now(),
            ]);
            $locked->events()->create([
                'user_id' => $request->user()?->id,
                'status' => 'transfer_requested',
                'notes' => 'Transfer #' . $transfer->id,
                'occurred_at' => now(),
            ]);
            return $transfer;
        });

        return response()->json(['data' => $transfer->load('fromDriver', 'toDriver')], 201);
    }

    public function acceptTransfer(Request $request, PackageTransfer $transfer)
    {
        $driver = $this->driver($request);
        if (!$driver || (int) $transfer->to_driver_id !== (int) $driver->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $result = DB::transaction(function () use ($driver, $request, $transfer): PackageTransfer {
            $locked = PackageTransfer::query()->lockForUpdate()->findOrFail($transfer->id);
            if ($locked->status !== 'pending') {
                if ($locked->status === 'accepted') return $locked->load('package', 'fromDriver', 'toDriver');
                throw ValidationException::withMessages(['transfer' => 'Only pending transfers can be accepted.']);
            }
            $package = TransportPackage::query()->lockForUpdate()->findOrFail($locked->package_id);
            if ($package->driver_id !== $locked->from_driver_id) {
                throw ValidationException::withMessages(['transfer' => 'The package owner changed before acceptance.']);
            }
            $locked->forceFill(['status' => 'accepted', 'accepted_by_user_id' => $request->user()?->id, 'accepted_at' => now()])->save();
            $package->forceFill(['driver_id' => $driver->id, 'status' => $package->status === 'received' ? 'in_progress' : $package->status])->save();
            $package->events()->create([
                'user_id' => $request->user()?->id,
                'status' => 'transfer_accepted',
                'notes' => 'Transfer #' . $locked->id,
                'occurred_at' => now(),
            ]);
            return $locked->fresh(['package', 'fromDriver', 'toDriver']);
        });

        return response()->json(['data' => $result]);
    }

    private function driver(Request $request)
    {
        return $request->user()?->driver;
    }

    private function packagePayload(TransportPackage $package): array
    {
        return [
            'public_id' => $package->public_id,
            'reference' => $package->reference,
            'status' => $package->status,
            'trip_id' => $package->trip_id,
            'driver_id' => $package->driver_id,
            'route' => $package->trip?->route?->origin && $package->trip?->route?->destination
                ? $package->trip->route->origin . ' → ' . $package->trip->route->destination
                : null,
            'events' => $package->events?->map(fn ($event) => ['status' => $event->status, 'notes' => $event->notes, 'occurred_at' => $event->occurred_at])->values(),
            'transfers' => $package->transfers?->map(fn ($transfer) => ['id' => $transfer->id, 'status' => $transfer->status, 'from_driver_id' => $transfer->from_driver_id, 'to_driver_id' => $transfer->to_driver_id])->values(),
        ];
    }
}
