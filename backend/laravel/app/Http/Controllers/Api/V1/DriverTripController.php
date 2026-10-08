<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TripResource;
use App\Models\BookingPassenger;
use App\Models\Trip;
use App\Services\Trips\TripStateService;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class DriverTripController extends Controller
{
    public function start(Request $request, Trip $trip, TripStateService $states)
    {
        $this->assertAssigned($request, $trip);
        if ($trip->status === 'scheduled') $states->transition($trip, 'boarding', $request->user());
        $trip = $states->transition($trip->fresh(), 'in_progress', $request->user());
        return new TripResource($trip);
    }

    public function complete(Request $request, Trip $trip, TripStateService $states)
    {
        $this->assertAssigned($request, $trip);
        return new TripResource($states->transition($trip, 'completed', $request->user()));
    }

    public function passengers(Request $request, Trip $trip)
    {
        $this->assertAssigned($request, $trip);
        $passengers = BookingPassenger::query()
            ->with('booking')
            ->whereHas('booking', fn($q)=>$q->where('trip_id',$trip->id)->where('status','confirmed'))
            ->orderBy('id')->get();
        return response()->json(['data'=>$passengers]);
    }

    public function board(Request $request, Trip $trip, BookingPassenger $passenger)
    {
        $this->assertAssigned($request, $trip);
        if ($passenger->booking?->trip_id !== $trip->id || $passenger->booking?->status !== 'confirmed') abort(404);
        $passenger->forceFill(['status'=>'boarded','boarded_at'=>now()])->save();
        return response()->json(['data'=>$passenger->fresh()]);
    }

    private function assertAssigned(Request $request, Trip $trip): void
    {
        $driver = $request->user()?->driver;
        if (!$driver || ($trip->driver_id !== $driver->id && $request->user()?->role !== 'admin')) abort(403, 'Trip is not assigned to this driver.');
    }
}
