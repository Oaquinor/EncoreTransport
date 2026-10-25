<?php
namespace App\Services\Payments;
use App\Models\Payment;
interface PaymentGatewayInterface
{
    /**
     * Start or resume checkout for this payment. Implementations must use
     * the stable payment public_id as their provider idempotency reference.
     *
     * @return array{checkout_url?: string}
     */
    public function initiate(Payment $payment, array $context = []): array;

    public function verifyWebhook(array $payload, array $headers = []): array;
}
