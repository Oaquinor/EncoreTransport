<?php

namespace Tests\Feature;

use App\Contracts\Maps\MapServiceInterface;
use Tests\TestCase;

class TomTomIntegrationTest extends TestCase
{
    public function test_geocode_uses_real_tomtom_when_key_is_configured(): void
    {
        if (!config('maps.tomtom.api_key')) {
            $this->markTestSkipped('TOMTOM_API_KEY is not configured.');
        }

        $result = app(MapServiceInterface::class)->geocode('Santo Domingo, Dominican Republic', ['limit' => 1]);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('results', $result);
    }
}
