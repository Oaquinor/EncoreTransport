<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
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
    Route::get('trips/{trip}/location', [DriverLocationController::class, 'latest']);

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
    });

    Route::middleware('api.token:driver,admin')->group(function () {
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

        Route::post('tickets/validate', [TicketController::class, 'validateTicket'])
            ->middleware('throttle:60,1');
    });

    Route::middleware('api.token:admin')->group(function () {
        Route::get('admin/dashboard', [AdminDashboardController::class, 'show']);

        Route::get('admin/reports', [AdminReportController::class, 'index']);
        Route::get('admin/reports/travel', [AdminReportController::class, 'travel']);
        Route::get('admin/reports/vehicles', [AdminReportController::class, 'vehicles']);
        Route::get('admin/reports/trips', [AdminReportController::class, 'trips']);
        Route::get('admin/reports/trip-costs', [AdminReportController::class, 'tripCosts']);

        Route::get('admin/incidents', [IncidentController::class, 'index']);
        Route::patch('admin/incidents/{incident}', [IncidentController::class, 'update']);

        Route::get('admin/driver-schedules', [DriverScheduleController::class, 'index']);
        Route::post('admin/driver-schedules', [DriverScheduleController::class, 'store']);
        Route::put('admin/driver-schedules/{driverSchedule}', [DriverScheduleController::class, 'update']);

        Route::get('admin/packages', [PackageController::class, 'index']);
        Route::get('admin/vehicle-status', [VehicleStatusController::class, 'index']);
    });
});
