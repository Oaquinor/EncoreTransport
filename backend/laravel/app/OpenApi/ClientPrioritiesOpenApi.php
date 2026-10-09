<?php
namespace App\OpenApi;
use OpenApi\Attributes as OA;
class ClientPrioritiesOpenApi {
    #[OA\Get(path:'/api/v1/packages/track/{token}',operationId:'trackPackage',summary:'Public package status using opaque tracking token',tags:['Packages'],parameters:[new OA\Parameter(name:'token',in:'path',required:true,schema:new OA\Schema(type:'string'))],responses:[new OA\Response(response:200,description:'Package status'),new OA\Response(response:404,description:'Not found')])]
    public function trackPackage():void{}
    #[OA\Post(path:'/api/v1/driver/packages',operationId:'createPackage',summary:'Register package for assigned trip',tags:['Packages'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:201,description:'Package created'),new OA\Response(response:403,description:'Forbidden')])]
    public function createPackage():void{}
    #[OA\Post(path:'/api/v1/driver/packages/{package}/status',operationId:'updatePackageStatus',summary:'Advance package status',tags:['Packages'],security:[['bearerAuth'=>[]]],parameters:[new OA\Parameter(name:'package',in:'path',required:true,schema:new OA\Schema(type:'integer'))],responses:[new OA\Response(response:200,description:'Package updated'),new OA\Response(response:422,description:'Invalid transition')])]
    public function updatePackage():void{}
    #[OA\Get(path:'/api/v1/driver/schedule',operationId:'driverSchedule',summary:'Current driver schedule',tags:['Schedules'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Schedule')])]
    public function driverSchedule():void{}
    #[OA\Get(path:'/api/v1/admin/driver-schedules',operationId:'adminDriverSchedules',summary:'List driver schedules',tags:['Schedules'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Schedules')])]
    public function adminSchedules():void{}
    #[OA\Post(path:'/api/v1/admin/driver-schedules',operationId:'createDriverSchedule',summary:'Create driver schedule',tags:['Schedules'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:201,description:'Schedule created'),new OA\Response(response:422,description:'Conflict')])]
    public function createSchedule():void{}
    #[OA\Post(path:'/api/v1/driver/vehicle-status',operationId:'driverVehicleStatus',summary:'Record driver-reported vehicle status',tags:['Fleet Status'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:201,description:'Status recorded')])]
    public function vehicleStatus():void{}
    #[OA\Get(path:'/api/v1/admin/reports/travel',operationId:'travelReport',summary:'Travel activity report',tags:['Reports'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Travel report')])]
    public function travelReport():void{}
    #[OA\Get(path:'/api/v1/admin/reports/vehicles',operationId:'vehicleReport',summary:'Vehicle utilization report',tags:['Reports'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Vehicle report')])]
    public function vehicleReport():void{}
    #[OA\Get(path:'/api/v1/admin/reports/trips',operationId:'tripReport',summary:'Detailed trip report',tags:['Reports'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Trip report')])]
    public function tripReport():void{}
    #[OA\Get(path:'/api/v1/admin/reports/trip-costs',operationId:'tripCostReport',summary:'Trip cost report availability and sources',tags:['Reports'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Trip cost report or explicit missing sources')])]
    public function tripCostReport():void{}
}
