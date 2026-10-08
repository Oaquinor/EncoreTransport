<?php
return [
    'currency'=>env('ENCORE_CURRENCY','DOP'),
    'booking_hold_minutes'=>(int)env('ENCORE_BOOKING_HOLD_MINUTES',15),
    'payment_gateway'=>env('ENCORE_PAYMENT_GATEWAY','unconfigured'),
];
