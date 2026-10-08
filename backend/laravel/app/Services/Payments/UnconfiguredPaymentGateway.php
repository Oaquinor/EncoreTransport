<?php
namespace App\Services\Payments;
use App\Models\Payment;
use RuntimeException;
class UnconfiguredPaymentGateway implements PaymentGatewayInterface {
    public function initiate(Payment $payment, array $context = []): array { throw new RuntimeException('Payment gateway is not configured.'); }
    public function verifyWebhook(array $payload, array $headers = []): array { throw new RuntimeException('Payment gateway is not configured.'); }
}
