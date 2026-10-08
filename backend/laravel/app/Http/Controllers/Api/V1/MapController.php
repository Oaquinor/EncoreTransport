<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Maps\MapServiceInterface;
use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;
use Throwable;

class MapController extends Controller
{
    public function __construct(private readonly MapServiceInterface $maps) {}

    public function search(Request $request) { $d=$request->validate(['q'=>['required','string','max:250'],'limit'=>['nullable','integer','min:1','max:20']]); return $this->call(fn()=>['raw'=>$this->maps->search($d['q'],['limit'=>$d['limit']??10])]); }
    public function geocode(Request $request) { $d=$request->validate(['address'=>['required','string','max:300']]); return $this->call(fn()=>$this->normalizeGeocode($this->maps->geocode($d['address']))); }
    public function reverseGeocode(Request $request) { $d=$request->validate(['latitude'=>['required','numeric','between:-90,90'],'longitude'=>['required','numeric','between:-180,180']]); return $this->call(fn()=>['raw'=>$this->maps->reverseGeocode((float)$d['latitude'],(float)$d['longitude'])]); }
    public function route(Request $request) { $d=$request->validate(['origin_latitude'=>['required','numeric','between:-90,90'],'origin_longitude'=>['required','numeric','between:-180,180'],'destination_latitude'=>['required','numeric','between:-90,90'],'destination_longitude'=>['required','numeric','between:-180,180']]); return $this->call(fn()=>$this->normalizeRoute($this->maps->calculateRoute((float)$d['origin_latitude'],(float)$d['origin_longitude'],(float)$d['destination_latitude'],(float)$d['destination_longitude']))); }

    #[OA\Get(path:'/api/v1/maps/journey',operationId:'mapJourney',summary:'Geocodificar origen/destino y calcular ruta TomTom',tags:['Maps'],parameters:[new OA\Parameter(name:'origin',in:'query',required:true,schema:new OA\Schema(type:'string')),new OA\Parameter(name:'destination',in:'query',required:true,schema:new OA\Schema(type:'string'))],responses:[new OA\Response(response:200,description:'Ruta normalizada'),new OA\Response(response:422,description:'Direccion no resuelta'),new OA\Response(response:503,description:'TomTom no configurado')])]
    public function journey(Request $request)
    {
        $d=$request->validate(['origin'=>['required','string','max:250'],'destination'=>['required','string','max:250']]);
        return $this->call(function() use($d){
            $origin=$this->normalizeGeocode($this->maps->geocode($d['origin']));
            $destination=$this->normalizeGeocode($this->maps->geocode($d['destination']));
            if (!$origin || !$destination) throw new RuntimeException('Unable to resolve origin or destination.');
            $route=$this->normalizeRoute($this->maps->calculateRoute($origin['latitude'],$origin['longitude'],$destination['latitude'],$destination['longitude']));
            return ['origin'=>$origin,'destination'=>$destination,'route'=>$route];
        }, 422);
    }

    private function normalizeGeocode(array $payload): ?array
    {
        $item=$payload['results'][0]??null;
        if (!$item || !isset($item['position']['lat'],$item['position']['lon'])) return null;
        return ['name'=>$item['address']['freeformAddress']??$item['poi']['name']??null,'latitude'=>(float)$item['position']['lat'],'longitude'=>(float)$item['position']['lon']];
    }

    private function normalizeRoute(array $payload): array
    {
        $route=$payload['routes'][0]??[]; $summary=$route['summary']??[]; $points=[];
        foreach (($route['legs']??[]) as $leg) foreach (($leg['points']??[]) as $point) if(isset($point['latitude'],$point['longitude'])) $points[]=['latitude'=>(float)$point['latitude'],'longitude'=>(float)$point['longitude']];
        return ['distanceMeters'=>(int)($summary['lengthInMeters']??0),'durationSeconds'=>(int)($summary['travelTimeInSeconds']??0),'trafficDelaySeconds'=>(int)($summary['trafficDelayInSeconds']??0),'points'=>$points];
    }

    private function call(callable $callback, int $runtimeStatus=503)
    {
        try { return response()->json(['data'=>$callback()]); }
        catch (RuntimeException $e) { $status=str_contains($e->getMessage(),'Unable to resolve')?$runtimeStatus:503; return response()->json(['message'=>$e->getMessage()],$status); }
        catch (ConnectionException) { return response()->json(['message'=>'Map provider is temporarily unavailable.'],503); }
        catch (Throwable $e) { report($e); return response()->json(['message'=>'Unable to complete the map request.'],502); }
    }
}
