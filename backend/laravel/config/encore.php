<?php
return [
    'country'=>env('ENCORE_COUNTRY','Guyana'),
    'currency'=>env('ENCORE_CURRENCY','GYD'),
    'locale'=>env('ENCORE_LOCALE','en-GY'),
    'timezone'=>env('ENCORE_TIMEZONE','America/Guyana'),
    'booking_hold_minutes'=>(int)env('ENCORE_BOOKING_HOLD_MINUTES',15),
    'payment_gateway'=>env('ENCORE_PAYMENT_GATEWAY','unconfigured'),
];
