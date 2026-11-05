<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MapLocationEndpointTest extends TestCase
{
    public function test_search_returns_safe_normalized_location_suggestions(): void
    {
        config([
            'maps.provider' => 'tomtom',
            'maps.tomtom.api_key' => 'test-map-key',
            'maps.tomtom.search_base_url' => 'https://api.tomtom.test/search/2',
        ]);

        Http::fake([
            '*' => Http::response([
                'results' => [[
                    'id' => 'poi-1',
                    'type' => 'POI',
                    'score' => 0.98,
                    'poi' => ['name' => 'Encore Terminal'],
                    'address' => ['freeformAddress' => 'Av. Central, Santo Domingo'],
                    'position' => ['lat' => 18.4861, 'lon' => -69.9312],
                ]],
            ], 200),
        ]);

        $this->getJson('/api/v1/maps/search?q=Encore%20Terminal')
            ->assertOk()
            ->assertJsonPath('data.results.0.name', 'Encore Terminal')
            ->assertJsonPath('data.results.0.address', 'Av. Central, Santo Domingo')
            ->assertJsonPath('data.results.0.latitude', 18.4861)
            ->assertJsonPath('data.results.0.longitude', -69.9312)
            ->assertJsonMissingPath('data.results.0.raw');
    }

    public function test_reverse_geocode_returns_a_normalized_location(): void
    {
        config([
            'maps.provider' => 'tomtom',
            'maps.tomtom.api_key' => 'test-map-key',
            'maps.tomtom.search_base_url' => 'https://api.tomtom.test/search/2',
        ]);

        Http::fake([
            '*' => Http::response([
                'results' => [[
                    'address' => ['freeformAddress' => 'Santo Domingo, DO'],
                    'position' => ['lat' => 18.4861, 'lon' => -69.9312],
                ]],
            ], 200),
        ]);

        $this->getJson('/api/v1/maps/reverse-geocode?latitude=18.4861&longitude=-69.9312')
            ->assertOk()
            ->assertJsonPath('data.name', 'Santo Domingo, DO')
            ->assertJsonPath('data.latitude', 18.4861)
            ->assertJsonPath('data.longitude', -69.9312);
    }
}
