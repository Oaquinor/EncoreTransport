<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DriverLocation;
use App\Models\Trip;
use Illuminate\Http\Request;

class DriverLocationController extends Controller
{
    public function store(Request $request)
    {
        $data=$request->validate([
            'trip_id'=>['required','integer','exists:trips,id'],
            'latitude'=>['required','numeric','between:-90,90'],
            'longitude'=>['required','numeric','between:-180,180'],
            'heading'=>['nullable','numeric','between:0,360'],
            'speed_kph'=>['nullable','numeric','min:0','max:250'],
            'recorded_at'=>['required','date'],
        ]);
        $driver=$request->user()?->driver;
        if(!$driver) return response()->json(['message'=>'Driver profile not found.'],422);
        $trip=Trip::query()->findOrFail($data['trip_id']);
        if($trip->driver_id!==$driver->id && $request->user()?->role!=='admin') return response()->json(['message'=>'This trip is not assigned to the authenticated driver.'],403);
        if(!in_array($trip->status,['boarding','in_progress'],true)) return response()->json(['message'=>'Location can only be sent for boarding or in-progress trips.'],422);
        $location=DriverLocation::query()->create($data+['driver_id'=>$driver->id]);
        return response()->json(['data'=>$location],201);
    }

    public function latest(Trip $trip)
    {
        $location=DriverLocation::query()->where('trip_id',$trip->id)->latest('recorded_at')->first();
        return response()->json(['data'=>$location,'meta'=>['is_stale'=>$location ? $location->recorded_at->lt(now()->subMinutes(5)) : true]]);
    }
}
