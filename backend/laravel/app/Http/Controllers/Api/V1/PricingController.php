<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\Pricing\PricingService;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class PricingController extends Controller
{
    #[OA\Get(path:'/api/v1/trips/{trip}/quote',operationId:'tripQuote',summary:'Cotizar viaje desde backend',tags:['Trips'],parameters:[new OA\Parameter(name:'trip',in:'path',required:true,schema:new OA\Schema(type:'integer')),new OA\Parameter(name:'passengers',in:'query',required:true,schema:new OA\Schema(type:'integer',minimum:1,maximum:10))],responses:[new OA\Response(response:200,description:'Cotizacion')])]
    public function show(Request $request, Trip $trip, PricingService $pricing)
    {
        $data = $request->validate(['passengers'=>['required','integer','min:1','max:10']]);
        if (!in_array($trip->status, ['scheduled','boarding'], true)) return response()->json(['message'=>'Trip is not bookable.'], 422);
        return response()->json(['data'=>$pricing->quote($trip, (int) $data['passengers'])]);
    }
}
