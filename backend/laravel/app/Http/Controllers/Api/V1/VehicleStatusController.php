<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\VehicleStatusReport;
use Illuminate\Http\Request;
class VehicleStatusController extends Controller {
    public function store(Request $request){$d=$request->validate(['trip_id'=>['required','exists:trips,id'],'fuel_status'=>['nullable','in:ok,warning,critical,unknown'],'engine_status'=>['nullable','in:ok,warning,critical,unknown'],'tires_status'=>['nullable','in:ok,warning,critical,unknown'],'network_status'=>['nullable','in:online,degraded,offline,unknown'],'fuel_percent'=>['nullable','integer','between:0,100'],'notes'=>['nullable','string','max:2000']]);$driver=$request->user()?->driver;if(!$driver)return response()->json(['message'=>'Driver profile not found.'],404);$trip=Trip::findOrFail($d['trip_id']);if($request->user()?->role!=='admin'&&$trip->driver_id!==$driver->id)return response()->json(['message'=>'Forbidden.'],403);$report=VehicleStatusReport::create($d+['bus_id'=>$trip->bus_id,'driver_id'=>$driver->id,'reported_at'=>now()]);return response()->json(['data'=>$report->load(['bus','driver','trip.route'])],201);}
    public function index(Request $request){$q=VehicleStatusReport::with(['bus','driver','trip.route'])->latest('reported_at');if($request->filled('bus_id'))$q->where('bus_id',(int)$request->bus_id);return response()->json(['data'=>$q->limit(300)->get()]);}
}
