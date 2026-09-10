<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\Trip;

class AdminDashboardController extends Controller
{
    public function show()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'metrics' => [
                    'tripsToday' => Trip::query()->count(),
                    'bookings' => Booking::query()->count(),
                    'passengers' => Booking::query()->sum('passenger_count') ?: 0,
                    'occupancy' => 0,
                    'revenue' => Booking::query()->sum('total_amount') ?: 0,
                    'activeDrivers' => Driver::query()->count(),
                    'availableBuses' => Bus::query()->count()
                ],
                'trips' => Trip::query()->with(['route', 'bus', 'driver'])->get(),
                'buses' => Bus::query()->get(),
                'routes' => [],
                'drivers' => Driver::query()->get(),
                'passengers' => Booking::query()->get(),
                'inventory' => []
            ]
        ]);
    }
}