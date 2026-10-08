<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(version:'1.1.0',title:'EncoreTransport API',description:'REST API v1. Laravel/MySQL are the source of truth. External providers are never simulated.')]
#[OA\Server(url:'http://127.0.0.1:8000',description:'Local Laravel server')]
#[OA\SecurityScheme(securityScheme:'bearerAuth',type:'http',scheme:'bearer',bearerFormat:'Token')]
#[OA\Tag(name:'Health')]
#[OA\Tag(name:'Authentication')]
#[OA\Tag(name:'Routes')]
#[OA\Tag(name:'Trips')]
#[OA\Tag(name:'Seats')]
#[OA\Tag(name:'Bookings')]
#[OA\Tag(name:'Payments')]
#[OA\Tag(name:'Tickets')]
#[OA\Tag(name:'Drivers')]
#[OA\Tag(name:'Tracking')]
#[OA\Tag(name:'Incidents')]
#[OA\Tag(name:'Maps')]
#[OA\Tag(name:'Admin')]
#[OA\Tag(name:'Reports')]
#[OA\Schema(schema:'ApiError',type:'object',properties:[new OA\Property(property:'message',type:'string'),new OA\Property(property:'errors',type:'object',nullable:true)])]
#[OA\Schema(schema:'User',type:'object',properties:[new OA\Property(property:'id',type:'integer'),new OA\Property(property:'name',type:'string'),new OA\Property(property:'email',type:'string',format:'email'),new OA\Property(property:'role',type:'string',enum:['passenger','driver','admin']),new OA\Property(property:'active',type:'boolean')])]
#[OA\Schema(schema:'Seat',type:'object',properties:[new OA\Property(property:'id',type:'integer'),new OA\Property(property:'seat_number',type:'string'),new OA\Property(property:'available',type:'boolean')])]
class OpenApiSpec {}
