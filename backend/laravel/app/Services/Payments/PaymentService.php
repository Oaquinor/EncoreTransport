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
            if ($existing->status !== 'failed') {
                $checkoutUrl = $existing->metadata['checkout_url'] ?? null;
                return [
                    'payment' => $existing,
                    'gateway' => $checkoutUrl ? ['checkout_url' => $checkoutUrl] : null,
                    'idempotent_replay' => true,
                ];
            }

            // Reuse the same payment identity when the client retries after a
            // gateway failure. This keeps retries idempotent while allowing a
            // recovered provider to proceed.
            $payment = $existing->forceFill([
                'status' => 'pending',
                'gateway' => (string) config('encore.payment_gateway', 'unconfigured'),
            ]);
            $payment->save();
            $this->audit->record($actor, 'payment.retry', $payment, ['booking_id' => $booking->id]);
        } else {
            $payment = Payment::query()->create(
                [
                    'idempotency_key' => $idempotencyKey,
                    'public_id' => (string) Str::uuid(),
                    'booking_id' => $booking->id,
                    'gateway' => (string) config('encore.payment_gateway', 'unconfigured'),
                    'status' => 'pending',
                    'amount_minor' => (int) $booking->total_amount * 100,
                    'currency' => (string) config('encore.currency', 'GYD'),
                ]
            );

            $this->audit->record($actor, 'payment.initiated', $payment, ['booking_id' => $booking->id]);
        }

        try {
            $result = $this->gateway->initiate($payment, ['booking' => $booking]);
            $metadata = $payment->metadata ?? [];
            $checkoutUrl = $result['checkout_url'] ?? null;
            if (is_string($checkoutUrl) && filter_var($checkoutUrl, FILTER_VALIDATE_URL) && parse_url($checkoutUrl, PHP_URL_SCHEME) === 'https') {
                $metadata['checkout_url'] = $checkoutUrl;
            }
            $payment->forceFill(['status' => 'processing', 'metadata' => $metadata])->save();
            return ['payment' => $payment->fresh(), 'gateway' => $result];
        } catch (RuntimeException $e) {
            $payment->forceFill(['status' => 'failed'])->save();
            $this->audit->record($actor, 'payment.gateway_unavailable', $payment, ['message' => $e->getMessage()]);
            throw $e;
        }
    }
}
