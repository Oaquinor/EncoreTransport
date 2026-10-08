<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\Payments\PaymentService;
use Illuminate\Http\Request;
use RuntimeException;
use OpenApi\Attributes as OA;

class PaymentController extends Controller
{
    #[OA\Post(path:'/api/v1/bookings/{booking}/payments',operationId:'initiatePayment',summary:'Iniciar pago mediante gateway configurado',tags:['Payments'],security:[['bearerAuth'=>[]]],parameters:[new OA\Parameter(name:'booking',in:'path',required:true,schema:new OA\Schema(type:'integer'))],responses:[new OA\Response(response:201,description:'Pago iniciado'),new OA\Response(response:503,description:'Gateway no configurado')])]
    public function store(Request $request, Booking $booking, PaymentService $service)
    {
        if ($booking->user_id !== $request->user()?->id && $request->user()?->role !== 'admin') abort(403);
        $data = $request->validate(['idempotency_key'=>['required','string','max:80']]);
        try {
            $result = $service->initiate($booking, $data['idempotency_key'], $request->user());
            return response()->json(['data'=>$result], 201);
        } catch (RuntimeException $e) {
            return response()->json(['message'=>$e->getMessage()], 503);
        }
    }

    #[OA\Get(path:'/api/v1/bookings/{booking}/payments',operationId:'listBookingPayments',summary:'Consultar pagos de reserva',tags:['Payments'],security:[['bearerAuth'=>[]]],responses:[new OA\Response(response:200,description:'Pagos')])]
    public function index(Request $request, Booking $booking)
    {
        if ($booking->user_id !== $request->user()?->id && $request->user()?->role !== 'admin') abort(403);
        return response()->json(['data'=>Payment::query()->where('booking_id',$booking->id)->latest()->get()]);
    }
}
