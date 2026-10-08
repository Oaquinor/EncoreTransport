<?php
return [
    'booking_hold_minutes' => (int) env('BOOKING_HOLD_MINUTES', 15),
    'maps' => ['browser_key' => env('GOOGLE_MAPS_BROWSER_KEY')],
    'payments' => ['gateway' => env('PAYMENT_GATEWAY', 'unconfigured')],
    'whatsapp' => ['token' => env('WHATSAPP_ACCESS_TOKEN'), 'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID')],
];
