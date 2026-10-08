<?php
namespace App\Services\Payments;
use App\Models\Payment;
interface PaymentGatewayInterface {
    public function initiate(Payment $payment, array $context = []): array;
    public function verifyWebhook(array $payload, array $headers = []): array;
}
