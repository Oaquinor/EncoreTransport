<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingPassenger;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\DriverSchedule;
use App\Models\Incident;
use App\Models\Payment;
use App\Models\TransportPackage;
use App\Models\TransportRoute;
use App\Models\Trip;
use App\Services\Auth\PermissionService;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
class AdminDashboardController extends Controller {
    public function __construct(private readonly PermissionService $permissions) {}

    #[OA\Get(path:'/api/v1/admin/dashboard',operationId:'adminDashboard',summary:'Real administrative dashboard',tags:['Admin'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Dashboard'),new OA\Response(response:403,description:'Admin only')])]
    public function show(Request $request){
        $user = $request->user();
        $can = fn (string $permission): bool => $this->permissions->allows($user, $permission);
        $canTrips = $can('trips.view');
        $canBookings = $can('bookings.view');
        $canVehicles = $can('vehicles.view');
        $canRoutes = $can('routes.view');
        $canDrivers = $can('drivers.view');
        $canPayments = $can('payments.view');
        $canCargo = $can('cargo.view');
        $canSchedules = $can('schedules.view');
        $canIncidents = $can('incidents.view');

        $trips = collect();
        if ($canTrips) {
            $tripRelations = [];
            if ($canRoutes) $tripRelations[] = 'route';
            if ($canVehicles) $tripRelations[] = 'bus';
            if ($canDrivers) $tripRelations[] = 'driver';
            $trips = Trip::query()
                ->with($tripRelations)
                ->orderByDesc('departure_date')
                ->orderBy('departure_time')
                ->limit(100)
                ->get();
        }

        $bookings = $canBookings
            ? Booking::query()->with(['trip.route', 'trip.bus'])->withCount('passengers')->latest()->limit(100)->get()
            : collect();
        $capacity = $canTrips && $canVehicles
            ? $trips->sum(fn ($trip) => (int) ($trip->bus?->capacity ?? 0))
            : 0;
        $available = $canTrips && $canVehicles
            ? $trips->sum(fn ($trip) => (int) $trip->available_seats)
            : 0;
        $metrics = [];

        if ($canTrips) {
            $metrics['tripsToday'] = Trip::query()->whereDate('departure_date', today())->count();
        }
        if ($canBookings) {
            $metrics['bookings'] = Booking::query()->count();
            $metrics['pendingBookings'] = Booking::query()->where('status', 'pending_payment')->count();
            $metrics['passengers'] = BookingPassenger::query()->count();
        }
        if ($canPayments) {
            $metrics['revenue'] = ((int) Payment::query()->where('status', 'paid')->sum('amount_minor')) / 100;
        }
        if ($canTrips && $canVehicles) {
            $metrics['occupancy'] = $capacity > 0 ? round((($capacity - $available) / $capacity) * 100, 1) : 0;
        }
        if ($canVehicles) $metrics['availableBuses'] = Bus::query()->where('status', 'operational')->count();
        if ($canDrivers) $metrics['activeDrivers'] = Driver::query()->whereIn('status', ['active', 'upcoming'])->count();
        if ($canIncidents) $metrics['incidents'] = Incident::query()->where('status', '!=', 'resolved')->count();
        if ($canCargo) $metrics['packagesInTransit'] = TransportPackage::query()->whereIn('status', ['received', 'in_progress'])->count();
        if ($canSchedules) $metrics['schedulesToday'] = DriverSchedule::query()->whereDate('work_date', today())->where('status', '!=', 'cancelled')->count();

        $data = [
            'metrics' => $metrics,
            'capabilities' => [
                'trips' => $canTrips,
                'bookings' => $canBookings,
                'vehicles' => $canVehicles,
                'routes' => $canRoutes,
                'drivers' => $canDrivers,
                'payments' => $canPayments,
                'cargo' => $canCargo,
                'schedules' => $canSchedules,
                'incidents' => $canIncidents,
            ],
        ];

        if ($canTrips) $data['trips'] = $trips;
        if ($canBookings) $data['bookings'] = $bookings;
        if ($canVehicles) $data['buses'] = Bus::query()->orderBy('code')->limit(300)->get();
        if ($canRoutes) $data['routes'] = TransportRoute::query()->where('active', true)->orderBy('origin')->limit(300)->get();
        if ($canDrivers) $data['drivers'] = Driver::query()->orderBy('name')->limit(300)->get();

        return response()->json(['data' => $data]);
    }
}
