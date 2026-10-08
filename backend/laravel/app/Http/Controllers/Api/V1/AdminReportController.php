<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Incident;
use App\Models\Payment;
use App\Models\Trip;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class AdminReportController extends Controller
{
    #[OA\Get(
        path: '/api/v1/admin/reports',
        operationId: 'adminReports',
        summary: 'Operational report from database',
        tags: ['Admin'],
        security: [['bearerAuth' => []]],
        responses: [new OA\Response(response: 200, description: 'Report')]
    )]
    public function index(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($data['from'])
            ? CarbonImmutable::parse($data['from'])->startOfDay()
            : CarbonImmutable::today()->subDays(6)->startOfDay();
        $to = isset($data['to'])
            ? CarbonImmutable::parse($data['to'])->endOfDay()
            : CarbonImmutable::today()->endOfDay();

        $trips = Trip::query()->whereBetween('departure_date', [$from->toDateString(), $to->toDateString()]);
        $bookings = Booking::query()->whereBetween('created_at', [$from, $to]);
        $payments = Payment::query()->whereBetween('created_at', [$from, $to]);

        return response()->json([
            'data' => [
                'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'trips' => [
                    'total' => (clone $trips)->count(),
                    'completed' => (clone $trips)->where('status', 'completed')->count(),
                    'cancelled' => (clone $trips)->where('status', 'cancelled')->count(),
                ],
                'bookings' => [
                    'total' => (clone $bookings)->count(),
                    'confirmed' => (clone $bookings)->where('status', 'confirmed')->count(),
                    'pending' => (clone $bookings)->where('status', 'pending_payment')->count(),
                ],
                'payments' => [
                    'paid' => (clone $payments)->where('status', 'paid')->count(),
                    'revenue_minor' => (clone $payments)->where('status', 'paid')->sum('amount_minor'),
                ],
                'incidents' => Incident::query()->whereBetween('created_at', [$from, $to])->count(),
            ],
        ]);
    }
}
