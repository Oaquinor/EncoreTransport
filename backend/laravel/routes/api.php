<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AdminAccessController;
use App\Http\Controllers\Api\V1\AssistantController;
use App\Http\Controllers\Api\V1\AdminFleetController;
use App\Http\Controllers\Api\V1\AdminReportController;
use App\Http\Controllers\Api\V1\AdminSettingsController;
use App\Http\Controllers\Api\V1\AdminTripController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookingController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\DriverLocationController;
use App\Http\Controllers\Api\V1\DriverScheduleController;
use App\Http\Controllers\Api\V1\DriverTripController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\IncidentController;
use App\Http\Controllers\Api\V1\LiveNetworkController;
use App\Http\Controllers\Api\V1\MapController;
use App\Http\Controllers\Api\V1\PackageController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PricingController;
use App\Http\Controllers\Api\V1\RouteController;
use App\Http\Controllers\Api\V1\SeatController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\TripController;
use App\Http\Controllers\Api\V1\VehicleStatusController;
use App\Http\Controllers\Api\V1\WebsiteContentController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('health', HealthController::class);

    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');

    Route::get('routes', [RouteController::class, 'index']);
    Route::get('website-content', [WebsiteContentController::class, 'published']);
    Route::get('routes/{transportRoute}', [RouteController::class, 'show']);
    Route::get('trips/search', [TripController::class, 'search']);
    Route::get('trips/{trip}', [TripController::class, 'show']);
    Route::get('trips/{trip}/seats', [SeatController::class, 'index']);
    Route::get('trips/{trip}/quote', [PricingController::class, 'show']);
    Route::get('network/live', LiveNetworkController::class)->middleware('throttle:30,1');

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

    // Guest checkout uses the per-booking token returned at creation.
    Route::middleware('api.token.optional')->group(function () {
        Route::post('bookings', [BookingController::class, 'store'])->middleware('throttle:20,1');
        Route::get('bookings/{booking}', [BookingController::class, 'show']);
        Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel']);
        Route::post('bookings/{booking}/payments', [PaymentController::class, 'store'])
            ->middleware('throttle:20,1');
        Route::get('bookings/{booking}/ticket', [TicketController::class, 'show']);
    });

    Route::middleware('api.token')->group(function () {
        Route::get('assistant/tools', [AssistantController::class, 'tools']);
        Route::post('assistant/tools/{tool}', [AssistantController::class, 'execute'])->middleware('throttle:60,1');
    });

    Route::middleware('api.token')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/profile/photo', [AuthController::class, 'uploadProfilePhoto'])->middleware('throttle:10,1');
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('bookings', [BookingController::class, 'index']);

        Route::get('bookings/{booking}/payments', [PaymentController::class, 'index']);

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
        Route::middleware('permission:settings.view')->get('admin/settings', [AdminSettingsController::class, 'show']);
        Route::middleware('permission:settings.update')->put('admin/settings/email', [AdminSettingsController::class, 'updateEmail']);
        Route::middleware('permission:settings.view')->get('admin/website-content', [WebsiteContentController::class, 'draft']);
        Route::middleware('permission:settings.view')->get('admin/website-content/media', [WebsiteContentController::class, 'media']);
        Route::middleware('permission:settings.update')->put('admin/website-content/draft', [WebsiteContentController::class, 'saveDraft']);
        Route::middleware('permission:settings.update')->put('admin/website-content/publish', [WebsiteContentController::class, 'publish']);
        Route::middleware('permission:settings.update')->post('admin/website-content/media', [WebsiteContentController::class, 'uploadMedia']);
        Route::middleware('permission:settings.update')->delete('admin/website-content/media', [WebsiteContentController::class, 'deleteMedia']);

        Route::middleware('permission:reports.view')->group(function () {
            Route::get('admin/reports', [AdminReportController::class, 'index']);
            Route::get('admin/reports/travel', [AdminReportController::class, 'travel']);
            Route::get('admin/reports/vehicles', [AdminReportController::class, 'vehicles']);
            Route::get('admin/reports/trips', [AdminReportController::class, 'trips']);
            Route::get('admin/reports/trip-costs', [AdminReportController::class, 'tripCosts']);
            Route::get('admin/reports/bookings', [AdminReportController::class, 'bookings']);
            Route::get('admin/reports/revenue', [AdminReportController::class, 'revenue']);
            Route::get('admin/reports/incidents', [AdminReportController::class, 'incidents']);
            Route::get('admin/reports/packages', [AdminReportController::class, 'packages']);
            Route::get('admin/reports/schedules', [AdminReportController::class, 'schedules']);
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
    Route::middleware(['api.token', 'permission:trips.view'])->get('admin/trips', [AdminTripController::class, 'index']);
    Route::middleware(['api.token', 'permission:trips.create'])->post('admin/trips', [AdminTripController::class, 'store']);
    Route::middleware(['api.token', 'permission:trips.update'])->put('admin/trips/{trip}', [AdminTripController::class, 'update']);
    Route::middleware(['api.token', 'permission:trips.cancel'])->post('admin/trips/{trip}/cancel', [AdminTripController::class, 'cancel']);
    Route::middleware(['api.token', 'permission:routes.view'])->get('admin/routes', [RouteController::class, 'adminIndex']);
    Route::middleware(['api.token', 'permission:routes.create'])->post('admin/routes', [RouteController::class, 'store']);
    Route::middleware(['api.token', 'permission:routes.update'])->put('admin/routes/{transportRoute}', [RouteController::class, 'update']);
    Route::middleware(['api.token', 'permission:routes.update'])->post('admin/routes/{transportRoute}/deactivate', [RouteController::class, 'deactivate']);
    Route::middleware(['api.token', 'permission:routes.update'])->post('admin/routes/{transportRoute}/image', [RouteController::class, 'uploadImage']);
    Route::middleware(['api.token', 'permission:routes.update'])->delete('admin/routes/{transportRoute}/image', [RouteController::class, 'deleteImage']);
    Route::middleware(['api.token', 'permission:drivers.view'])->get('admin/drivers', [AdminFleetController::class, 'drivers']);
    Route::middleware(['api.token', 'permission:drivers.create'])->post('admin/drivers', [AdminFleetController::class, 'storeDriver']);
    Route::middleware(['api.token', 'permission:drivers.update'])->put('admin/drivers/{driver}', [AdminFleetController::class, 'updateDriver']);
    Route::middleware(['api.token', 'permission:drivers.update'])->post('admin/drivers/{driver}/photo', [AdminFleetController::class, 'uploadDriverPhoto']);
    Route::middleware(['api.token', 'permission:drivers.update'])->post('admin/drivers/{driver}/deactivate', [AdminFleetController::class, 'deactivateDriver']);
    Route::middleware(['api.token', 'permission:vehicles.view'])->get('admin/vehicles', [AdminFleetController::class, 'vehicles']);
    Route::middleware(['api.token', 'permission:vehicles.create'])->post('admin/vehicles', [AdminFleetController::class, 'storeVehicle']);
    Route::middleware(['api.token', 'permission:vehicles.update'])->put('admin/vehicles/{bus}', [AdminFleetController::class, 'updateVehicle']);
    Route::middleware(['api.token', 'permission:users.view'])->get('admin/users', [AdminAccessController::class, 'users']);
    Route::middleware(['api.token', 'permission:users.create'])->post('admin/users', [AdminAccessController::class, 'storeUser']);
    Route::middleware(['api.token', 'permission:users.update'])->put('admin/users/{user}', [AdminAccessController::class, 'updateUser']);
    Route::middleware(['api.token', 'permission:users.disable'])->post('admin/users/{user}/disable', [AdminAccessController::class, 'disableUser']);
    Route::middleware(['api.token', 'permission:roles.view,roles.manage'])->get('admin/roles', [AdminAccessController::class, 'roles']);
    Route::middleware(['api.token', 'permission:roles.manage'])->put('admin/roles/{role}', [AdminAccessController::class, 'updateRole']);
    Route::middleware(['api.token', 'permission:permissions.view,permissions.assign'])->get('admin/permissions', [AdminAccessController::class, 'permissions']);
});
