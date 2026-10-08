<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\DriverLocation;
use Illuminate\Http\Request;
class DriverLocationController extends Controller {
    public function store(Request $request) {
        $data=$request->validate([
            'trip_id'=>['required','integer','exists:trips,id'],'latitude'=>['required','numeric','between:-90,90'],'longitude'=>['required','numeric','between:-180,180'],
            'heading'=>['nullable','numeric','between:0,360'],'speed_kph'=>['nullable','numeric','min:0','max:250'],'recorded_at'=>['required','date']
        ]);
        $driver=$request->user()->driver;
        if(!$driver){ return response()->json(['message'=>'Driver profile not found.'],422); }
        $location=DriverLocation::query()->create($data+['driver_id'=>$driver->id]);
        return response()->json(['data'=>$location],201);
    }
    public function latest(int $trip) {
        $location=DriverLocation::query()->where('trip_id',$trip)->latest('recorded_at')->first();
        return response()->json(['data'=>$location]);
    }
}
