<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\TransportRoute;
use App\Models\Trip;
use OpenApi\Attributes as OA;

class AdminDashboardController extends Controller
{
    #[OA\Get(
        path: '/api/v1/admin/dashboard',
        operationId: 'adminDashboard',
        summary: 'Consultar resumen administrativo',
        tags: ['Admin'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Resumen administrativo'),
            new OA\Response(response: 401, description: 'No autenticado'),
            new OA\Response(response: 403, description: 'Rol no permitido'),
        ]
    )]
    public function show()
    {
        $tripsToday = Trip::query()->whereDate('departure_date', today())->count();
        $bookings = Booking::query()->count();
        $passengers = Booking::query()->withCount('passengers')->get()->sum('passengers_count');

        return response()->json([
            'success' => true,
            'data' => [
                'metrics' => [
                    'tripsToday' => $tripsToday,
                    'bookings' => $bookings,
                    'passengers' => $passengers,
                    'revenue' => Booking::query()->where('status', 'confirmed')->sum('total_amount') ?: 0,
                    'activeDrivers' => Driver::query()->whereIn('status', ['active', 'upcoming'])->count(),
                    'availableBuses' => Bus::query()->where('status', 'operational')->count(),
                ],
                'trips' => Trip::query()->with(['route', 'bus', 'driver'])->orderBy('departure_date')->orderBy('departure_time')->get(),
                'buses' => Bus::query()->orderBy('code')->get(),
                'routes' => TransportRoute::query()->where('active', true)->orderBy('origin')->get(),
                'drivers' => Driver::query()->orderBy('name')->get(),
            ],
        ]);
    }
}
