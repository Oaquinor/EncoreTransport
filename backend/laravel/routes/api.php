<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AdminReportController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\DriverLocationController;
use App\Http\Controllers\Api\V1\DriverTripController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\IncidentController;
use App\Http\Controllers\Api\V1\MapController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PricingController;
use App\Http\Controllers\Api\V1\RouteController;
use App\Http\Controllers\Api\V1\SeatController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\TripController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('health', HealthController::class);

    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::prefix('maps')->middleware('throttle:60,1')->group(function () {
        Route::get('search', [MapController::class, 'search']);
        Route::get('geocode', [MapController::class, 'geocode']);
        Route::get('reverse-geocode', [MapController::class, 'reverseGeocode']);
        Route::get('route', [MapController::class, 'route']);
        Route::get('journey', [MapController::class, 'journey']);
    });

    Route::get('routes', [RouteController::class, 'index']);
    Route::get('routes/{transportRoute}', [RouteController::class, 'show']);
    Route::get('trips/search', [TripController::class, 'search']);
    Route::get('trips/{trip}', [TripController::class, 'show']);
    Route::get('trips/{trip}/seats', [SeatController::class, 'index']);
    Route::get('trips/{trip}/quote', [PricingController::class, 'show']);
    Route::get('trips/{trip}/location', [DriverLocationController::class, 'latest']);

    Route::middleware('api.token')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('bookings', [BookingController::class, 'index']);
        Route::post('bookings', [BookingController::class, 'store'])->middleware('throttle:20,1');
        Route::get('bookings/{booking}', [BookingController::class, 'show']);
        Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel'])->middleware('throttle:20,1');
        Route::get('bookings/{booking}/payments', [PaymentController::class, 'index']);
        Route::post('bookings/{booking}/payments', [PaymentController::class, 'store'])->middleware('throttle:10,1');
        Route::get('bookings/{booking}/ticket', [TicketController::class, 'show']);
    });

    Route::middleware('api.token:driver,admin')->group(function () {
        Route::get('driver/me', [DriverController::class, 'profile']);
        Route::get('driver/trips/current', [DriverController::class, 'currentTrip']);
        Route::get('driver/trips/{trip}/passengers', [DriverTripController::class, 'passengers']);
        Route::post('driver/trips/{trip}/start', [DriverTripController::class, 'start'])->middleware('throttle:20,1');
        Route::post('driver/trips/{trip}/complete', [DriverTripController::class, 'complete'])->middleware('throttle:20,1');
        Route::post('driver/trips/{trip}/passengers/{passenger}/board', [DriverTripController::class, 'board'])->middleware('throttle:60,1');
        Route::post('driver/locations', [DriverLocationController::class, 'store'])->middleware('throttle:120,1');
        Route::post('driver/incidents', [IncidentController::class, 'store'])->middleware('throttle:20,1');
        Route::post('tickets/validate', [TicketController::class, 'validateTicket'])->middleware('throttle:60,1');
    });

    Route::middleware('api.token:admin')->prefix('admin')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'show']);
        Route::get('reports', [AdminReportController::class, 'index']);
        Route::get('incidents', [IncidentController::class, 'index']);
        Route::patch('incidents/{incident}', [IncidentController::class, 'update']);
    });
});
