<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\RouteResource;
use App\Models\TransportRoute;

class RouteController extends Controller
{
    public function index()
    {
        return RouteResource::collection(TransportRoute::query()->orderBy('origin')->get());
    }
}