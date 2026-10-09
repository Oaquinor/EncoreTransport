<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RealMapTileProxyTest extends TestCase
{
    use RefreshDatabase;

    public function test_map_tile_proxy_returns_tomtom_raster_without_exposing_api_key(): void
    {
        config([
            'maps.provider' => 'tomtom',
            'maps.tomtom.api_key' => 'test-secret-map-key',
            'maps.tomtom.display_base_url' => 'https://api.tomtom.test',
            'maps.tomtom.language' => 'es-ES',
            'maps.tomtom.view' => 'Unified',
        ]);

        Http::fake([
            'https://api.tomtom.test/maps/orbis/map-display/tile/10/300/400.png*' =>
                Http::response('PNG_BYTES', 200, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=300',
                    'ETag' => '"test"',
                ]),
        ]);

        $response = $this->get('/api/v1/maps/tiles/10/300/400.png?style=street-light');

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertSee('PNG_BYTES', false);

        Http::assertSent(function ($request) {
            return str_starts_with(
                $request->url(),
                'https://api.tomtom.test/maps/orbis/map-display/tile/10/300/400.png'
            )
                && str_contains($request->url(), 'key=test-secret-map-key')
                && str_contains($request->url(), 'style=street-light')
                && $request->hasHeader('TomTom-Api-Version', '1');
        });

        $this->assertStringNotContainsString(
            'test-secret-map-key',
            $response->getContent()
        );
    }

    public function test_map_tile_proxy_rejects_invalid_coordinates_before_tomtom_call(): void
    {
        config([
            'maps.provider' => 'tomtom',
            'maps.tomtom.api_key' => 'test-secret-map-key',
        ]);

        Http::fake();

        $this->getJson('/api/v1/maps/tiles/2/99/99.png')
            ->assertStatus(503)
            ->assertJsonPath('message', 'Invalid map tile coordinates.');

        Http::assertNothingSent();
    }

    public function test_map_tile_proxy_classifies_tomtom_authorization_failure_without_leaking_key(): void
    {
        config([
            'maps.provider' => 'tomtom',
            'maps.tomtom.api_key' => 'test-secret-map-key',
            'maps.tomtom.display_base_url' => 'https://api.tomtom.test',
        ]);

        Http::fake([
            'https://api.tomtom.test/maps/orbis/map-display/tile/0/0/0.png*' =>
                Http::response([
                    'detailedError' => [
                        'code' => 'FORBIDDEN',
                        'message' => 'Invalid key',
                    ],
                ], 403),
        ]);

        $response = $this->getJson('/api/v1/maps/tiles/0/0/0.png');

        $response
            ->assertStatus(502)
            ->assertJsonPath('code', 'MAP_PROVIDER_AUTHORIZATION_FAILED')
            ->assertJsonPath('service', 'map-display');

        $this->assertStringNotContainsString(
            'test-secret-map-key',
            $response->getContent()
        );
    }
}
