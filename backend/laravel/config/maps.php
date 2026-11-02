<?php

return [
    'provider' => env('MAP_PROVIDER', 'tomtom'),

    'tomtom' => [
        'api_key' => env('TOMTOM_API_KEY'),
        'search_base_url' => env('TOMTOM_SEARCH_BASE_URL', 'https://api.tomtom.com/search/2'),
        'routing_base_url' => env('TOMTOM_ROUTING_BASE_URL', 'https://api.tomtom.com/routing/1'),
        'display_base_url' => env('TOMTOM_DISPLAY_BASE_URL', 'https://api.tomtom.com'),
        'language' => env('TOMTOM_LANGUAGE', 'en-GB'),
        'country_set' => env('TOMTOM_COUNTRY_SET', 'GY'),
        'view' => env('TOMTOM_VIEW', 'Unified'),
        'style' => env('TOMTOM_MAP_STYLE', 'street-light'),
        'tile_size' => (int) env('TOMTOM_TILE_SIZE', 256),
        'travel_mode' => env('TOMTOM_TRAVEL_MODE', 'car'),
        'timeout' => (int) env('TOMTOM_TIMEOUT', 15),
        // Tile caching is bounded and only applied when TomTom permits it.
        'cache_enabled' => filter_var(env('TOMTOM_TILE_CACHE_ENABLED', true), FILTER_VALIDATE_BOOL),
        'cache_store' => env('TOMTOM_TILE_CACHE_STORE'),
        'cache_default_ttl' => (int) env('TOMTOM_TILE_CACHE_DEFAULT_TTL', 300),
        'cache_max_ttl' => (int) env('TOMTOM_TILE_CACHE_MAX_TTL', 3600),
    ],
];
