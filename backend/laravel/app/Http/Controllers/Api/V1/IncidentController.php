<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Models\Trip;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
class IncidentController extends Controller {
    #[OA\Post(path:'/api/v1/driver/incidents',operationId:'createDriverIncident',summary:'Create real trip incident',tags:['Drivers'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:201,description:'Incident')])]
    public function store(Request $request){$data=$request->validate(['trip_id'=>['required','integer','exists:trips,id'],'title'=>['required','string','max:120'],'description'=>['required','string','max:5000'],'severity'=>['nullable','in:low,medium,high']]);$driver=$request->user()?->driver;$trip=Trip::findOrFail($data['trip_id']);if($request->user()?->role!=='admin'&&(!$driver||$trip->driver_id!==$driver->id))return response()->json(['message'=>'Forbidden.'],403);$incident=Incident::create($data+['driver_id'=>$driver?->id,'reported_by_user_id'=>$request->user()?->id,'status'=>'open']);return response()->json(['data'=>$incident],201);}
    #[OA\Get(path:'/api/v1/admin/incidents',operationId:'listIncidents',summary:'List incidents',tags:['Admin'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Incidents')])]
    public function index(){return response()->json(['data'=>Incident::with(['trip.route','driver'])->latest()->limit(200)->get()]);}
}
