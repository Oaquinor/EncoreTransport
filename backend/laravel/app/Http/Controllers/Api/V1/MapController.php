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
    public function __construct(private readonly MapServiceInterface $maps)
    {
    }

    #[OA\Get(path: '/api/v1/maps/search', operationId: 'mapSearch', summary: 'Buscar lugares con TomTom', tags: ['Maps'], parameters: [new OA\Parameter(name: 'q', in: 'query', required: true, schema: new OA\Schema(type: 'string'))], responses: [new OA\Response(response: 200, description: 'Resultados de TomTom'), new OA\Response(response: 422, description: 'Parametros invalidos'), new OA\Response(response: 503, description: 'Proveedor de mapas no disponible')])]
    public function search(Request $request)
    {
        $data = $request->validate(['q' => ['required', 'string', 'max:250'], 'limit' => ['nullable', 'integer', 'min:1', 'max:20']]);
        return $this->call(fn () => $this->maps->search($data['q'], ['limit' => $data['limit'] ?? 10]));
    }

    #[OA\Get(path: '/api/v1/maps/geocode', operationId: 'mapGeocode', summary: 'Convertir direccion en coordenadas', tags: ['Maps'], parameters: [new OA\Parameter(name: 'address', in: 'query', required: true, schema: new OA\Schema(type: 'string'))], responses: [new OA\Response(response: 200, description: 'Resultado de geocodificacion'), new OA\Response(response: 422, description: 'Parametros invalidos'), new OA\Response(response: 503, description: 'Proveedor de mapas no disponible')])]
    public function geocode(Request $request)
    {
        $data = $request->validate(['address' => ['required', 'string', 'max:300']]);
        return $this->call(fn () => $this->maps->geocode($data['address']));
    }

    #[OA\Get(path: '/api/v1/maps/reverse-geocode', operationId: 'mapReverseGeocode', summary: 'Convertir coordenadas en direccion', tags: ['Maps'], parameters: [new OA\Parameter(name: 'latitude', in: 'query', required: true, schema: new OA\Schema(type: 'number', format: 'double')), new OA\Parameter(name: 'longitude', in: 'query', required: true, schema: new OA\Schema(type: 'number', format: 'double'))], responses: [new OA\Response(response: 200, description: 'Resultado de geocodificacion inversa'), new OA\Response(response: 422, description: 'Parametros invalidos'), new OA\Response(response: 503, description: 'Proveedor de mapas no disponible')])]
    public function reverseGeocode(Request $request)
    {
        $data = $request->validate(['latitude' => ['required', 'numeric', 'between:-90,90'], 'longitude' => ['required', 'numeric', 'between:-180,180']]);
        return $this->call(fn () => $this->maps->reverseGeocode((float) $data['latitude'], (float) $data['longitude']));
    }

    #[OA\Get(path: '/api/v1/maps/route', operationId: 'mapRoute', summary: 'Calcular ruta real con TomTom', tags: ['Maps'], parameters: [new OA\Parameter(name: 'origin_latitude', in: 'query', required: true, schema: new OA\Schema(type: 'number', format: 'double')), new OA\Parameter(name: 'origin_longitude', in: 'query', required: true, schema: new OA\Schema(type: 'number', format: 'double')), new OA\Parameter(name: 'destination_latitude', in: 'query', required: true, schema: new OA\Schema(type: 'number', format: 'double')), new OA\Parameter(name: 'destination_longitude', in: 'query', required: true, schema: new OA\Schema(type: 'number', format: 'double'))], responses: [new OA\Response(response: 200, description: 'Ruta calculada'), new OA\Response(response: 422, description: 'Parametros invalidos'), new OA\Response(response: 503, description: 'Proveedor de mapas no disponible')])]
    public function route(Request $request)
    {
        $data = $request->validate([
            'origin_latitude' => ['required', 'numeric', 'between:-90,90'],
            'origin_longitude' => ['required', 'numeric', 'between:-180,180'],
            'destination_latitude' => ['required', 'numeric', 'between:-90,90'],
            'destination_longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        return $this->call(fn () => $this->maps->calculateRoute(
            (float) $data['origin_latitude'],
            (float) $data['origin_longitude'],
            (float) $data['destination_latitude'],
            (float) $data['destination_longitude']
        ));
    }

    private function call(callable $callback)
    {
        try {
            return response()->json(['data' => $callback()]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        } catch (ConnectionException) {
            return response()->json(['message' => 'Map provider is temporarily unavailable.'], 503);
        } catch (Throwable $e) {
            report($e);
            return response()->json(['message' => 'Unable to complete the map request.'], 502);
        }
    }
}
