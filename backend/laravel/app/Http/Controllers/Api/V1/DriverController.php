<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Trip;

class DriverController extends Controller
{
    public function profile()
    {
        return response()->json(['success' => true, 'data' => ['name' => 'Driver', 'status' => 'upcoming']]);
    }

    public function currentTrip()
    {
        return new TripResource(Trip::query()->with(['route', 'bus', 'driver'])->first());
    }
}