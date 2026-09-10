<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function search(Request $request)
    {
        $trips = Trip::query()->with('route')->get();

        return TripResource::collection($trips);
    }

    public function show(Trip $trip)
    {
        return new TripResource($trip->load(['route', 'bus', 'driver']));
    }
}