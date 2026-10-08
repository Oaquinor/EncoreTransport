<?php

namespace App\Services\Pricing;

use App\Models\Trip;

class PricingService
{
    public function quote(Trip $trip, int $passengerCount): array
    {
        $baseFare = (int) $trip->price_per_passenger;
        $subtotal = $baseFare * $passengerCount;

        return [
            'currency' => (string) config('encore.currency', 'DOP'),
            'base_fare' => $baseFare,
            'passengers' => $passengerCount,
            'fees' => 0,
            'discounts' => 0,
            'taxes' => 0,
            'subtotal' => $subtotal,
            'total' => $subtotal,
        ];
    }
}
