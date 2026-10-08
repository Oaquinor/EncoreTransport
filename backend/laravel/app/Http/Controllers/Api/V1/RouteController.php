<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\RouteResource;
use App\Models\TransportRoute;
use OpenApi\Attributes as OA;

class RouteController extends Controller
{
    #[OA\Get(path:'/api/v1/routes',operationId:'listRoutes',summary:'Listar rutas activas',tags:['Routes'],responses:[new OA\Response(response:200,description:'Rutas')])]
    public function index()
    {
        return RouteResource::collection(TransportRoute::query()->where('active',true)->with('stops')->orderBy('origin')->orderBy('destination')->get());
    }

    public function show(TransportRoute $transportRoute)
    {
        if (!$transportRoute->active) abort(404);
        return new RouteResource($transportRoute->load('stops'));
    }
}
