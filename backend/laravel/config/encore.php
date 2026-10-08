<?php

return [
    'booking_hold_minutes' => (int) env('BOOKING_HOLD_MINUTES', 15),
    'currency' => env('ENCORE_CURRENCY', 'DOP'),
    'demo_mode' => filter_var(env('DEMO_MODE', false), FILTER_VALIDATE_BOOL),
    'maps' => [
        'provider' => env('MAP_PROVIDER', 'tomtom'),
    ],
    'payments' => [
        'gateway' => env('PAYMENT_GATEWAY', 'unconfigured'),
    ],
    'whatsapp' => [
        'token' => env('WHATSAPP_ACCESS_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
    ],
];
