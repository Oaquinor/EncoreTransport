<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\RouteController;
use App\Http\Controllers\Api\V1\TripController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('health', HealthController::class);
    Route::get('routes', [RouteController::class, 'index']);
    Route::get('trips/search', [TripController::class, 'search']);
    Route::get('trips/{trip}', [TripController::class, 'show']);
    Route::get('driver/me', [DriverController::class, 'profile']);
    Route::get('driver/trips/current', [DriverController::class, 'currentTrip']);
    Route::get('admin/dashboard', [AdminDashboardController::class, 'show']);
});