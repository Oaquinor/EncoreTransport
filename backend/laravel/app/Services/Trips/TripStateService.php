<?php

namespace App\Services\Trips;

use App\Models\Trip;
use App\Models\User;
use App\Services\Audit\AuditService;
use Illuminate\Validation\ValidationException;

class TripStateService
{
    private const TRANSITIONS = [
        'scheduled' => ['boarding', 'cancelled'],
        'boarding' => ['in_progress', 'cancelled'],
        'in_progress' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ];

    public function __construct(private readonly AuditService $audit) {}

    public function transition(Trip $trip, string $nextStatus, ?User $actor = null): Trip
    {
        $allowed = self::TRANSITIONS[$trip->status] ?? [];
        if (!in_array($nextStatus, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => "Invalid trip transition from {$trip->status} to {$nextStatus}.",
            ]);
        }

        $changes = ['status' => $nextStatus];
        if ($nextStatus === 'in_progress') $changes['started_at'] = now();
        if ($nextStatus === 'completed') $changes['completed_at'] = now();
        if ($nextStatus === 'cancelled') $changes['cancelled_at'] = now();

        $previous = $trip->status;
        $trip->forceFill($changes)->save();
        $this->audit->record($actor, 'trip.status_changed', $trip, ['from' => $previous, 'to' => $nextStatus]);

        return $trip->fresh(['route','bus','driver']);
    }
}
