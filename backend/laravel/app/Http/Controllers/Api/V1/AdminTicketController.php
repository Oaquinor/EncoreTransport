<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminTicketController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:active,used,no_show,expired,cancelled,refunded'],
            'lifecycle' => ['nullable', 'in:valid,used,not_used,no_show,expired,cancelled,refunded'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $now = now();

        $query = Ticket::query()->with(['booking.trip.route', 'booking.payments', 'booking.user'])
            ->when($filters['q'] ?? null, function ($query, string $term): void {
                $like = '%' . addcslashes($term, '%_') . '%';
                $query->where(function ($nested) use ($like): void {
                    $nested->where('public_id', 'like', $like)->orWhereHas('booking', fn ($booking) => $booking->where('reference', 'like', $like)->orWhere('passenger_email', 'like', $like));
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['lifecycle'] ?? null, function ($query, string $lifecycle) use ($now): void {
                if ($lifecycle === 'valid') {
                    $query->where('status', 'active')->whereHas('booking.trip', function ($trip) use ($now): void {
                        $trip->where(function ($date) use ($now): void {
                            $date->whereDate('departure_date', '>', $now->toDateString())
                                ->orWhere(function ($sameDate) use ($now): void {
                                    $sameDate->whereDate('departure_date', $now->toDateString())
                                        ->whereTime('departure_time', '>=', $now->format('H:i:s'));
                                });
                        });
                    });
                } elseif ($lifecycle === 'not_used') {
                    $query->where('status', 'active')->whereHas('booking.trip', function ($trip) use ($now): void {
                        $trip->where(function ($date) use ($now): void {
                            $date->whereDate('departure_date', '<', $now->toDateString())
                                ->orWhere(function ($sameDate) use ($now): void {
                                    $sameDate->whereDate('departure_date', $now->toDateString())
                                        ->whereTime('departure_time', '<', $now->format('H:i:s'));
                                });
                        });
                    });
                }
                else $query->where('status', $lifecycle === 'used' ? 'used' : $lifecycle);
            })
            ->latest();

        $page = $query->paginate(min(100, max(10, (int) ($filters['per_page'] ?? 25))));
        $items = $page->getCollection()->map(fn (Ticket $ticket) => $this->payload($ticket))->values();

        return response()->json(['data' => $items, 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()]]);
    }

    public function show(Ticket $ticket)
    {
        $ticket->load(['booking.trip.route', 'booking.trip.bus', 'booking.payments', 'booking.user']);
        $history = AuditLog::query()->where('subject_type', Ticket::class)->where('subject_id', (string) $ticket->id)->latest()->get();
        return response()->json(['data' => [...$this->payload($ticket), 'history' => $history]]);
    }

    public function transition(Request $request, Ticket $ticket, AuditService $audit)
    {
        $data = $request->validate(['status' => ['required', 'in:no_show,expired,cancelled,refunded']]);
        $updated = DB::transaction(function () use ($data, $ticket, $request, $audit): Ticket {
            $locked = Ticket::query()->with('booking.payments')->lockForUpdate()->findOrFail($ticket->id);
            if ($locked->status !== 'active') throw ValidationException::withMessages(['status' => 'Only active tickets can change lifecycle state.']);
            if ($data['status'] === 'expired') {
                $trip = $locked->booking?->trip;
                $departure = $trip?->departure_date && $trip?->departure_time ? Carbon::parse($trip->departure_date->toDateString() . ' ' . $trip->departure_time) : null;
                if (!$departure || $departure->isFuture()) throw ValidationException::withMessages(['status' => 'A ticket cannot expire before its departure.']);
            }
            $locked->forceFill(['status' => $data['status']])->save();
            if ($data['status'] === 'refunded') $locked->booking?->payments()->where('status', 'paid')->update(['status' => 'refunded']);
            $audit->record($request->user(), 'ticket.' . $data['status'], $locked, ['previous_status' => 'active']);
            return $locked->fresh(['booking.trip.route', 'booking.payments', 'booking.user']);
        });

        return response()->json(['data' => $this->payload($updated)]);
    }

    private function payload(Ticket $ticket): array
    {
        $booking = $ticket->booking;
        $trip = $booking?->trip;
        $departure = $trip?->departure_date && $trip?->departure_time ? Carbon::parse($trip->departure_date->toDateString() . ' ' . $trip->departure_time) : null;
        $lifecycle = $ticket->status === 'active' ? ($departure && $departure->isPast() ? 'not_used' : 'valid') : $ticket->status;
        return [
            'id' => $ticket->id, 'public_id' => $ticket->public_id, 'status' => $ticket->status, 'lifecycle_status' => $lifecycle,
            'issued_at' => $ticket->issued_at, 'validated_at' => $ticket->validated_at, 'used_at' => $ticket->used_at,
            'boarding_status' => $ticket->used_at ? 'boarded' : 'not_boarded', 'booking_status' => $booking?->status,
            'payment_status' => $booking?->payments?->sortByDesc('id')->first()?->status, 'booking_reference' => $booking?->reference,
            'passenger' => $booking?->user ? ['id' => $booking->user->id, 'name' => $booking->user->name, 'email' => $booking->user->email] : ['name' => $booking?->passenger_name, 'email' => $booking?->passenger_email],
            'trip' => $trip ? ['id' => $trip->id, 'status' => $trip->status, 'departure_date' => $trip->departure_date?->toDateString(), 'departure_time' => $trip->departure_time, 'route' => $trip->route ? $trip->route->origin . ' → ' . $trip->route->destination : null] : null,
        ];
    }
}
