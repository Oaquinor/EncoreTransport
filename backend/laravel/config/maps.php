<?php

return [
    'provider' => env('MAP_PROVIDER', 'tomtom'),

    'tomtom' => [
        'api_key' => env('TOMTOM_API_KEY'),
        'search_base_url' => env('TOMTOM_SEARCH_BASE_URL', 'https://api.tomtom.com/search/2'),
        'routing_base_url' => env('TOMTOM_ROUTING_BASE_URL', 'https://api.tomtom.com/routing/1'),
        'language' => env('TOMTOM_LANGUAGE', 'es-ES'),
        'country_set' => env('TOMTOM_COUNTRY_SET', 'DO'),
    ],
];