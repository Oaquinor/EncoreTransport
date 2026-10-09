<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\DriverSchedule;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
class DriverScheduleController extends Controller {
    public function mine(Request $request){$driver=$request->user()?->driver;if(!$driver)return response()->json(['message'=>'Driver profile not found.'],404);return response()->json(['data'=>DriverSchedule::with(['bus','trip.route'])->where('driver_id',$driver->id)->whereDate('work_date','>=',today())->orderBy('work_date')->orderBy('starts_at')->limit(31)->get()]);}
    public function index(Request $request){$q=DriverSchedule::with(['driver','bus','trip.route','updatedBy'])->orderByDesc('work_date')->orderBy('starts_at');if($request->filled('date'))$q->whereDate('work_date',$request->date);if($request->filled('driver_id'))$q->where('driver_id',(int)$request->driver_id);return response()->json(['data'=>$q->limit(300)->get()]);}
    public function store(Request $request){return $this->persist($request,new DriverSchedule());}
    public function update(Request $request,DriverSchedule $driverSchedule){return $this->persist($request,$driverSchedule);}
    private function persist(Request $request,DriverSchedule $schedule){$d=$request->validate(['driver_id'=>['required','exists:drivers,id'],'bus_id'=>['nullable','exists:buses,id'],'trip_id'=>['nullable','exists:trips,id'],'work_date'=>['required','date'],'starts_at'=>['required','date_format:H:i'],'ends_at'=>['required','date_format:H:i','after:starts_at'],'status'=>['required','in:scheduled,active,changed,cancelled'],'notes'=>['nullable','string','max:2000']]);$conflict=DriverSchedule::query()->where('driver_id',$d['driver_id'])->whereDate('work_date',$d['work_date'])->when($schedule->exists, fn($q)=>$q->where('id','!=',$schedule->id))->where('status','!=','cancelled')->where(function($q)use($d){$q->where('starts_at','<',$d['ends_at'])->where('ends_at','>',$d['starts_at']);})->exists();if($conflict)throw ValidationException::withMessages(['starts_at'=>'The driver already has an overlapping schedule.']);$schedule->fill($d+['updated_by_user_id'=>$request->user()?->id])->save();return response()->json(['data'=>$schedule->fresh(['driver','bus','trip.route','updatedBy'])],$schedule->wasRecentlyCreated?201:200);}
}
