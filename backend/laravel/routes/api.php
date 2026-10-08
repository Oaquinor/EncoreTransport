<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\DriverLocationController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\MapController;
use App\Http\Controllers\Api\V1\RouteController;
use App\Http\Controllers\Api\V1\SeatController;
use App\Http\Controllers\Api\V1\TripController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('health', HealthController::class);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::get('maps/search', [MapController::class, 'search'])->middleware('throttle:60,1');
    Route::get('maps/geocode', [MapController::class, 'geocode'])->middleware('throttle:60,1');
    Route::get('maps/reverse-geocode', [MapController::class, 'reverseGeocode'])->middleware('throttle:60,1');
    Route::get('maps/route', [MapController::class, 'route'])->middleware('throttle:60,1');

    Route::get('routes', [RouteController::class, 'index']);
    Route::get('trips/search', [TripController::class, 'search']);
    Route::get('trips/{trip}', [TripController::class, 'show']);
    Route::get('trips/{trip}/seats', [SeatController::class, 'index']);
    Route::get('trips/{trip}/location', [DriverLocationController::class, 'latest']);

    Route::middleware('api.token')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('bookings', [BookingController::class, 'store'])->middleware('throttle:20,1');
        Route::get('bookings/{booking}', [BookingController::class, 'show']);
    });

    Route::middleware('api.token:driver,admin')->group(function () {
        Route::get('driver/me', [DriverController::class, 'profile']);
        Route::get('driver/trips/current', [DriverController::class, 'currentTrip']);
        Route::post('driver/locations', [DriverLocationController::class, 'store'])->middleware('throttle:120,1');
    });

    Route::get('admin/dashboard', [AdminDashboardController::class, 'show'])->middleware('api.token:admin');
});
