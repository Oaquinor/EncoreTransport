<?php

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use App\Services\Audit\AuditService;
use Illuminate\Support\Str;
use RuntimeException;

class PaymentService
{
    public function __construct(
        private readonly PaymentGatewayInterface $gateway,
        private readonly AuditService $audit,
    ) {}

    public function initiate(Booking $booking, string $idempotencyKey, ?User $actor = null): array
    {
        if ($booking->status !== 'pending_payment') {
            throw new RuntimeException('Booking is not awaiting payment.');
        }

        $existing = Payment::query()->where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            if ($existing->booking_id !== $booking->id) {
                throw new RuntimeException('Idempotency key already belongs to another payment.');
            }
            return ['payment' => $existing, 'gateway' => null, 'idempotent_replay' => true];
        }

        $payment = Payment::query()->create(
            [
                'idempotency_key' => $idempotencyKey,
                'public_id' => (string) Str::uuid(),
                'booking_id' => $booking->id,
                'gateway' => (string) config('encore.payment_gateway', 'unconfigured'),
                'status' => 'pending',
                'amount_minor' => (int) $booking->total_amount * 100,
                'currency' => (string) config('encore.currency', 'DOP'),
            ]
        );

        $this->audit->record($actor, 'payment.initiated', $payment, ['booking_id' => $booking->id]);

        try {
            $result = $this->gateway->initiate($payment, ['booking' => $booking]);
            $payment->forceFill(['status' => 'processing'])->save();
            return ['payment' => $payment->fresh(), 'gateway' => $result];
        } catch (RuntimeException $e) {
            $payment->forceFill(['status' => 'failed'])->save();
            $this->audit->record($actor, 'payment.gateway_unavailable', $payment, ['message' => $e->getMessage()]);
            throw $e;
        }
    }
}
