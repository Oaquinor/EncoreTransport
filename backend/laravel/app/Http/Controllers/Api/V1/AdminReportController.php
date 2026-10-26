<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\Incident;
use App\Models\Payment;
use App\Models\Trip;
use App\Models\TransportPackage;
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

        $dailyTrips = Trip::query()->selectRaw('DATE(departure_date) as report_date, COUNT(*) as total')
            ->whereBetween('departure_date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('report_date')->pluck('total', 'report_date');
        $dailyBookings = Booking::query()->selectRaw('DATE(created_at) as report_date, COUNT(*) as total')
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('status', ['confirmed', 'pending_payment'])
            ->groupBy('report_date')->pluck('total', 'report_date');
        $dailyRevenue = Payment::query()->selectRaw('DATE(created_at) as report_date, SUM(amount_minor) as total')
            ->whereBetween('created_at', [$from, $to])->where('status', 'paid')
            ->groupBy('report_date')->pluck('total', 'report_date');
        $daily = collect(range(0, $from->diffInDays($to)))->map(function (int $offset) use ($from, $dailyTrips, $dailyBookings, $dailyRevenue) {
            $day = $from->addDays($offset);
            $date = $day->toDateString();
            return [
                'date' => $date,
                'trips' => (int) ($dailyTrips[$date] ?? 0),
                'bookings' => (int) ($dailyBookings[$date] ?? 0),
                'revenue_minor' => (int) ($dailyRevenue[$date] ?? 0),
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
        $tripStats = Trip::query()->selectRaw("bus_id, COUNT(*) as trip_count, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count")
            ->whereBetween('departure_date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('bus_id')->get()->keyBy('bus_id');
        $items = Bus::query()->with('latestVehicleStatus')->orderBy('code')->get()->map(function ($bus) use ($tripStats) {
            $tripStat = $tripStats->get($bus->id);
            $latest = $bus->latestVehicleStatus;
            return [
                'bus_id' => $bus->id,
                'code' => $bus->code,
                'plate' => $bus->plate,
                'status' => $bus->status,
                'capacity' => (int) $bus->capacity,
                'trips' => (int) ($tripStat?->trip_count ?? 0),
                'completed_trips' => (int) ($tripStat?->completed_count ?? 0),
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

    public function bookings(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = Booking::query()->with([
            'trip.route', 'trip.bus', 'passengers', 'reservedSeats.seat', 'payments',
        ])->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')->limit(1000)->get()
            ->map(fn ($booking) => [
                'reference' => $booking->reference,
                'created_at' => $booking->created_at?->toIso8601String(),
                'trip_date' => $booking->trip?->departure_date?->toDateString(),
                'route' => trim(($booking->trip?->route?->origin ?? '') . ' → ' . ($booking->trip?->route?->destination ?? '')),
                'vehicle' => $booking->trip?->bus?->code,
                'passenger' => $booking->passenger_name,
                'passenger_count' => $booking->passengers->count() ?: 1,
                'seats' => $booking->reservedSeats->pluck('seat.seat_number')->filter()->values()->all()
                    ?: (array) ($booking->seat_numbers ?? []),
                'amount' => (float) $booking->total_amount,
                'status' => $booking->status,
                'payment_status' => $booking->payments->sortByDesc('created_at')->first()?->status ?? 'not_started',
            ]);

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'items' => $items,
            'limitations' => ['rows' => 'The report is capped at the latest 1,000 matching bookings.'],
        ]]);
    }

    public function revenue(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = Payment::query()->with('booking.trip.route')
            ->whereBetween('created_at', [$from, $to])
            ->where('status', 'paid')
            ->orderByDesc('created_at')->limit(1000)->get()
            ->map(fn ($payment) => [
                'payment_reference' => $payment->gateway_reference ?: $payment->public_id,
                'paid_at' => $payment->verified_at?->toIso8601String() ?? $payment->created_at?->toIso8601String(),
                'booking_reference' => $payment->booking?->reference,
                'route' => trim(($payment->booking?->trip?->route?->origin ?? '') . ' → ' . ($payment->booking?->trip?->route?->destination ?? '')),
                'amount' => (int) $payment->amount_minor,
                'currency' => $payment->currency,
                'gateway' => $payment->gateway,
            ]);

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'total_minor' => (int) $items->sum('amount'),
            'items' => $items,
            'limitations' => ['rows' => 'The report includes paid transactions and is capped at the latest 1,000 matching payments.'],
        ]]);
    }

    public function incidents(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = Incident::query()->with(['trip.route', 'driver'])
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')->limit(1000)->get()
            ->map(fn ($incident) => [
                'id' => $incident->id,
                'reported_at' => $incident->created_at?->toIso8601String(),
                'route' => trim(($incident->trip?->route?->origin ?? '') . ' → ' . ($incident->trip?->route?->destination ?? '')),
                'driver' => $incident->driver?->name,
                'title' => $incident->title,
                'severity' => $incident->severity,
                'status' => $incident->status,
                'resolved_at' => $incident->resolved_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => [
                'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'items' => $items,
                'limitations' => ['rows' => 'The report is capped at the latest 1,000 matching incidents.'],
            ],
        ]);
    }

    public function packages(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = TransportPackage::query()->with(['trip.route', 'driver'])
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')->limit(1000)->get()
            ->map(fn ($package) => [
                'reference' => $package->reference,
                'created_at' => $package->created_at?->toIso8601String(),
                'route' => trim(($package->trip?->route?->origin ?? '') . ' → ' . ($package->trip?->route?->destination ?? '')),
                'driver' => $package->driver?->name,
                'status' => $package->status,
                'delivered_at' => $package->delivered_at?->toIso8601String(),
            ]);

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'items' => $items,
            'limitations' => ['rows' => 'The report is capped at the latest 1,000 matching packages.'],
        ]]);
    }

    public function schedules(Request $request)
    {
        [$from, $to] = $this->period($request);
        $items = \App\Models\DriverSchedule::query()->with(['driver', 'bus', 'trip.route'])
            ->whereBetween('work_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('work_date')->orderBy('starts_at')->limit(1000)->get()
            ->map(fn ($schedule) => [
                'date' => $schedule->work_date?->toDateString(),
                'starts_at' => $schedule->starts_at,
                'ends_at' => $schedule->ends_at,
                'driver' => $schedule->driver?->name,
                'vehicle' => $schedule->bus?->code,
                'route' => trim(($schedule->trip?->route?->origin ?? '') . ' → ' . ($schedule->trip?->route?->destination ?? '')),
                'status' => $schedule->status,
            ]);

        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'items' => $items,
            'limitations' => ['rows' => 'The report is capped at 1,000 matching assignments.'],
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
