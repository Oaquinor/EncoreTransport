<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AdminFleetController;
use App\Http\Controllers\Api\V1\AdminReportController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\DriverLocationController;
use App\Http\Controllers\Api\V1\DriverScheduleController;
use App\Http\Controllers\Api\V1\DriverTripController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\IncidentController;
use App\Http\Controllers\Api\V1\MapController;
use App\Http\Controllers\Api\V1\PackageController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PricingController;
use App\Http\Controllers\Api\V1\RouteController;
use App\Http\Controllers\Api\V1\SeatController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\TripController;
use App\Http\Controllers\Api\V1\VehicleStatusController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('health', HealthController::class);

    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');

    Route::get('routes', [RouteController::class, 'index']);
    Route::get('routes/{transportRoute}', [RouteController::class, 'show']);
    Route::get('trips/search', [TripController::class, 'search']);
    Route::get('trips/{trip}', [TripController::class, 'show']);
    Route::get('trips/{trip}/seats', [SeatController::class, 'index']);
    Route::get('trips/{trip}/quote', [PricingController::class, 'show']);

    Route::prefix('maps')->group(function () {
        Route::get('search', [MapController::class, 'search'])->middleware('throttle:60,1');
        Route::get('geocode', [MapController::class, 'geocode'])->middleware('throttle:60,1');
        Route::get('reverse-geocode', [MapController::class, 'reverseGeocode'])->middleware('throttle:60,1');
        Route::get('route', [MapController::class, 'route'])->middleware('throttle:60,1');
        Route::get('journey', [MapController::class, 'journey'])->middleware('throttle:30,1');

        Route::get('tiles/{z}/{x}/{y}.png', [MapController::class, 'tile'])
            ->whereNumber('z')
            ->whereNumber('x')
            ->whereNumber('y')
            ->middleware('throttle:240,1');
    });

    Route::get('packages/track/{token}', [PackageController::class, 'track'])
        ->middleware('throttle:30,1');

    Route::middleware('api.token')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('bookings', [BookingController::class, 'index']);
        Route::post('bookings', [BookingController::class, 'store'])->middleware('throttle:20,1');
        Route::get('bookings/{booking}', [BookingController::class, 'show']);
        Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel']);

        Route::get('bookings/{booking}/payments', [PaymentController::class, 'index']);
        Route::post('bookings/{booking}/payments', [PaymentController::class, 'store'])
            ->middleware('throttle:20,1');

        Route::get('bookings/{booking}/ticket', [TicketController::class, 'show']);

        Route::get('trips/{trip}/location', [DriverLocationController::class, 'latest']);
    });

    Route::middleware(['api.token', 'permission:driver.access'])->group(function () {
        Route::get('driver/me', [DriverController::class, 'profile']);
        Route::get('driver/trips/current', [DriverController::class, 'currentTrip']);
        Route::get('driver/trips/{trip}/passengers', [DriverTripController::class, 'passengers']);
        Route::post('driver/trips/{trip}/start', [DriverTripController::class, 'start']);
        Route::post('driver/trips/{trip}/complete', [DriverTripController::class, 'complete']);
        Route::post('driver/trips/{trip}/passengers/{passenger}/board', [DriverTripController::class, 'board']);

        Route::post('driver/locations', [DriverLocationController::class, 'store'])
            ->middleware('throttle:120,1');

        Route::post('driver/incidents', [IncidentController::class, 'store']);
        Route::get('driver/schedule', [DriverScheduleController::class, 'mine']);
        Route::post('driver/vehicle-status', [VehicleStatusController::class, 'store']);
        Route::post('driver/packages', [PackageController::class, 'store']);
        Route::post('driver/packages/{package}/status', [PackageController::class, 'updateStatus']);

    });

    Route::middleware(['api.token', 'permission:tickets.validate'])
        ->post('tickets/validate', [TicketController::class, 'validateTicket'])
        ->middleware('throttle:60,1');

    Route::middleware('api.token')->group(function () {
        Route::middleware('permission:reports.view')->group(function () {
            Route::get('admin/reports', [AdminReportController::class, 'index']);
            Route::get('admin/reports/travel', [AdminReportController::class, 'travel']);
            Route::get('admin/reports/vehicles', [AdminReportController::class, 'vehicles']);
            Route::get('admin/reports/trips', [AdminReportController::class, 'trips']);
            Route::get('admin/reports/trip-costs', [AdminReportController::class, 'tripCosts']);
        });

        Route::middleware('permission:incidents.view')->get('admin/incidents', [IncidentController::class, 'index']);
        Route::middleware('permission:incidents.update')->patch('admin/incidents/{incident}', [IncidentController::class, 'update']);

        Route::middleware('permission:schedules.view')->get('admin/driver-schedules', [DriverScheduleController::class, 'index']);
        Route::middleware('permission:schedules.manage')->post('admin/driver-schedules', [DriverScheduleController::class, 'store']);
        Route::middleware('permission:schedules.manage')->put('admin/driver-schedules/{driverSchedule}', [DriverScheduleController::class, 'update']);

        Route::middleware('permission:cargo.view')->get('admin/packages', [PackageController::class, 'index']);
        Route::middleware('permission:vehicles.view')->get('admin/vehicle-status', [VehicleStatusController::class, 'index']);
    });

    Route::middleware(['api.token', 'permission:dashboard.view'])->get('admin/dashboard', [AdminDashboardController::class, 'show']);
    Route::middleware(['api.token', 'permission:routes.view'])->get('admin/routes', [RouteController::class, 'adminIndex']);
    Route::middleware(['api.token', 'permission:routes.create'])->post('admin/routes', [RouteController::class, 'store']);
    Route::middleware(['api.token', 'permission:routes.update'])->put('admin/routes/{transportRoute}', [RouteController::class, 'update']);
    Route::middleware(['api.token', 'permission:routes.update'])->post('admin/routes/{transportRoute}/deactivate', [RouteController::class, 'deactivate']);
    Route::middleware(['api.token', 'permission:drivers.view'])->get('admin/drivers', [AdminFleetController::class, 'drivers']);
    Route::middleware(['api.token', 'permission:drivers.create'])->post('admin/drivers', [AdminFleetController::class, 'storeDriver']);
    Route::middleware(['api.token', 'permission:drivers.update'])->put('admin/drivers/{driver}', [AdminFleetController::class, 'updateDriver']);
    Route::middleware(['api.token', 'permission:drivers.update'])->post('admin/drivers/{driver}/photo', [AdminFleetController::class, 'uploadDriverPhoto']);
    Route::middleware(['api.token', 'permission:drivers.update'])->post('admin/drivers/{driver}/deactivate', [AdminFleetController::class, 'deactivateDriver']);
    Route::middleware(['api.token', 'permission:vehicles.view'])->get('admin/vehicles', [AdminFleetController::class, 'vehicles']);
    Route::middleware(['api.token', 'permission:vehicles.create'])->post('admin/vehicles', [AdminFleetController::class, 'storeVehicle']);
    Route::middleware(['api.token', 'permission:vehicles.update'])->put('admin/vehicles/{bus}', [AdminFleetController::class, 'updateVehicle']);
});
