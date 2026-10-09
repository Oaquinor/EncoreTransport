<?php

namespace Tests\Feature;

use App\Contracts\Maps\MapServiceInterface;
use Tests\TestCase;

class TomTomIntegrationTest extends TestCase
{
    private function requireTomTomKey(): void
    {
        if (!config('maps.tomtom.api_key')) {
            $this->markTestSkipped('TOMTOM_API_KEY is not configured.');
        }
    }

    public function test_geocode_uses_real_tomtom_when_key_is_configured(): void
    {
        $this->requireTomTomKey();

        $result = app(MapServiceInterface::class)
            ->geocode('Santo Domingo, Dominican Republic', ['limit' => 1]);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('results', $result);
        $this->assertNotEmpty($result['results']);
    }

    public function test_routing_uses_real_tomtom_when_key_is_configured(): void
    {
        $this->requireTomTomKey();

        $result = app(MapServiceInterface::class)->calculateRoute(
            18.4861,
            -69.9312,
            19.4517,
            -70.6970
        );

        $this->assertIsArray($result);
        $this->assertArrayHasKey('routes', $result);
        $this->assertNotEmpty($result['routes']);
    }

    public function test_map_display_uses_real_tomtom_when_key_is_configured(): void
    {
        $this->requireTomTomKey();

        $tile = app(MapServiceInterface::class)->rasterTile(0, 0, 0);

        $this->assertNotEmpty($tile['body']);
        $this->assertStringStartsWith(
            'image/',
            strtolower((string) $tile['content_type'])
        );
    }
}
