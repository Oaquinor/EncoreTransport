<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\Incident;
use App\Models\Payment;
use App\Models\Trip;
use App\Models\TransportPackage;
use App\Models\VehicleStatusReport;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class AdminReportController extends Controller
{
    private function period(Request $request): array
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($data['from'])
            ? CarbonImmutable::parse($data['from'])->startOfDay()
            : CarbonImmutable::today()->subDays(6)->startOfDay();
        $to = isset($data['to'])
            ? CarbonImmutable::parse($data['to'])->endOfDay()
            : CarbonImmutable::today()->endOfDay();

        return [$from, $to];
    }

    #[OA\Get(
        path: '/api/v1/admin/reports',
        operationId: 'adminReports',
        summary: 'Executive operational report',
        tags: ['Reports'],
        security: [['bearerAuth' => []]],
        responses: [new OA\Response(response: 200, description: 'Executive report')]
    )]
    public function index(Request $request)
    {
        [$from, $to] = $this->period($request);
        $trips = Trip::query()->whereBetween('departure_date', [$from->toDateString(), $to->toDateString()]);
        $bookings = Booking::query()->whereBetween('created_at', [$from, $to]);
        $payments = Payment::query()->whereBetween('created_at', [$from, $to])->where('status', 'paid');
        $paidCount = (clone $payments)->count();
        $revenueMinor = (int) (clone $payments)->sum('amount_minor');
        $capacity = (int) (clone $trips)->with('bus:id,capacity')->get()->sum(fn ($trip) => (int) ($trip->bus?->capacity ?? 0));
        $availableSeats = (int) (clone $trips)->sum('available_seats');
        $occupiedSeats = max(0, $capacity - $availableSeats);
        $confirmedBookings = (clone $bookings)->where('status', 'confirmed')->count();
        $activeFleet = Bus::query()->where('status', 'operational')->count();

        $daily = collect(range(0, $from->diffInDays($to)))->map(function (int $offset) use ($from) {
            $day = $from->addDays($offset);
            return [
                'date' => $day->toDateString(),
                'trips' => Trip::query()->whereDate('departure_date', $day)->count(),
                'bookings' => Booking::query()->whereDate('created_at', $day)->whereIn('status', ['confirmed', 'pending_payment'])->count(),
                'revenue_minor' => (int) Payment::query()->whereDate('created_at', $day)->where('status', 'paid')->sum('amount_minor'),
            ];
        })->values();

        $upcoming = Trip::query()->with(['route', 'bus', 'driver'])
            ->whereDate('departure_date', '>=', today())
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->orderBy('departure_date')->orderBy('departure_time')->limit(8)->get()
            ->map(fn ($trip) => [
                'id' => $trip->id,
                'date' => $trip->departure_date?->toDateString(),
                'time' => $trip->departure_time,
                'route' => trim(($trip->route?->origin ?? '') . ' → ' . ($trip->route?->destination ?? '')),
                'vehicle' => $trip->bus?->code,
                'driver' => $trip->driver?->name,
                'available_seats' => (int) $trip->available_seats,
                'status' => $trip->status,
            ])->values();

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'trips' => [
                'total' => (clone $trips)->count(),
                'completed' => (clone $trips)->where('status', 'completed')->count(),
                'cancelled' => (clone $trips)->where('status', 'cancelled')->count(),
            ],
            'bookings' => [
                'total' => (clone $bookings)->count(),
                'confirmed' => $confirmedBookings,
                'pending' => (clone $bookings)->where('status', 'pending_payment')->count(),
                'cancelled' => (clone $bookings)->whereIn('status', ['cancelled', 'canceled'])->count(),
            ],
            'payments' => ['paid' => $paidCount, 'revenue_minor' => $revenueMinor],
            'occupancy' => [
                'capacity' => $capacity,
                'occupied' => $occupiedSeats,
                'available' => $availableSeats,
                'rate' => $capacity > 0 ? round(($occupiedSeats / $capacity) * 100, 1) : null,
            ],
            'fleet' => ['active' => $activeFleet, 'total' => Bus::query()->count()],
            'cargo' => [
                'received' => TransportPackage::query()->whereBetween('created_at', [$from, $to])->count(),
                'in_transit' => TransportPackage::query()->where('status', 'in_transit')->count(),
                'delivered' => TransportPackage::query()->whereBetween('delivered_at', [$from, $to])->count(),
            ],
            'incidents' => Incident::query()->whereBetween('created_at', [$from, $to])->count(),
            'daily' => $daily,
            'upcoming' => $upcoming,
        ]]);
    }

    public function travel(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = Trip::query()
            ->with(['route', 'bus', 'driver'])
            ->withCount(['bookings as booking_count' => fn ($q) => $q->whereIn('status', ['confirmed', 'pending_payment'])])
            ->whereBetween('departure_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('departure_date')->orderBy('departure_time')->limit(500)->get()
            ->map(fn ($trip) => [
                'trip_id' => $trip->id,
                'date' => $trip->departure_date?->toDateString(),
                'route' => trim(($trip->route?->origin ?? '').' → '.($trip->route?->destination ?? '')),
                'status' => $trip->status,
                'vehicle' => $trip->bus?->code,
                'driver' => $trip->driver?->name,
                'capacity' => (int) ($trip->bus?->capacity ?? 0),
                'available_seats' => (int) $trip->available_seats,
                'occupied_seats' => max(0, (int) ($trip->bus?->capacity ?? 0) - (int) $trip->available_seats),
                'booking_count' => (int) $trip->booking_count,
            ]);

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'items' => $items,
        ]]);
    }

    public function vehicles(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = Bus::query()->orderBy('code')->get()->map(function ($bus) use ($from, $to) {
            $tripQuery = Trip::query()->where('bus_id', $bus->id)
                ->whereBetween('departure_date', [$from->toDateString(), $to->toDateString()]);
            $latest = VehicleStatusReport::query()->where('bus_id', $bus->id)->latest('reported_at')->first();
            return [
                'bus_id' => $bus->id,
                'code' => $bus->code,
                'plate' => $bus->plate,
                'status' => $bus->status,
                'capacity' => (int) $bus->capacity,
                'trips' => (clone $tripQuery)->count(),
                'completed_trips' => (clone $tripQuery)->where('status', 'completed')->count(),
                'latest_vehicle_status' => $latest?->only(['fuel_status', 'engine_status', 'tires_status', 'network_status', 'fuel_percent', 'reported_at']),
            ];
        });

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'items' => $items,
            'limitations' => [
                'maintenance_costs' => 'No maintenance cost ledger exists in the current schema.',
                'fuel_costs' => 'No fuel cost ledger exists in the current schema.',
                'kilometre_actuals' => 'No odometer history exists in the current schema.',
            ],
        ]]);
    }

    public function trips(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = Trip::query()->with(['route', 'bus', 'driver'])->withCount(['bookings', 'incidents'])
            ->whereBetween('departure_date', [$from->toDateString(), $to->toDateString()])
            ->orderByDesc('departure_date')->orderBy('departure_time')->limit(500)->get()
            ->map(fn ($trip) => [
                'id' => $trip->id,
                'date' => $trip->departure_date?->toDateString(),
                'departure_time' => $trip->departure_time,
                'arrival_time' => $trip->arrival_time,
                'route' => trim(($trip->route?->origin ?? '').' → '.($trip->route?->destination ?? '')),
                'bus' => $trip->bus?->code,
                'driver' => $trip->driver?->name,
                'status' => $trip->status,
                'available_seats' => (int) $trip->available_seats,
                'bookings' => (int) $trip->bookings_count,
                'incidents' => (int) $trip->incidents_count,
            ]);

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'items' => $items,
        ]]);
    }

    public function tripCosts(Request $request)
    {
        [$from, $to] = $this->period($request);
        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'available' => false,
            'items' => [],
            'missing_sources' => ['fuel_expenses', 'tolls', 'maintenance_expenses', 'other_trip_expenses'],
            'message' => 'Trip Cost Summary is intentionally not calculated until real cost sources are defined and persisted.',
        ]]);
    }
}
