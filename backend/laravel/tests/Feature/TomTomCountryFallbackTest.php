<?php

namespace Tests\Feature;

use App\Contracts\Maps\MapServiceInterface;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TomTomCountryFallbackTest extends TestCase
{
    public function test_geocode_retries_without_country_set_when_restricted_lookup_is_empty(): void
    {
        config([
            'maps.provider' => 'tomtom',
            'maps.tomtom.api_key' => 'test-map-key',
            'maps.tomtom.search_base_url' => 'https://api.tomtom.test/search/2',
            'maps.tomtom.country_set' => 'DO',
            'maps.tomtom.language' => 'es-ES',
        ]);

        Http::fake(function ($request) {
            parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);

            if (($query['countrySet'] ?? null) === 'DO') {
                return Http::response([
                    'results' => [],
                ], 200);
            }

            return Http::response([
                'results' => [
                    [
                        'position' => [
                            'lat' => 42.3601,
                            'lon' => -71.0589,
                        ],
                        'address' => [
                            'freeformAddress' => 'Boston, MA',
                        ],
                    ],
                ],
            ], 200);
        });

        $result = app(MapServiceInterface::class)->geocode('Boston');

        $this->assertNotEmpty($result['results']);
        $this->assertSame(
            42.3601,
            (float) $result['results'][0]['position']['lat']
        );

        Http::assertSentCount(2);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'countrySet=DO');
        });

        Http::assertSent(function ($request) {
            parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);

            return !array_key_exists('countrySet', $query);
        });
    }

    public function test_geocode_does_not_retry_globally_when_country_lookup_succeeds(): void
    {
        config([
            'maps.provider' => 'tomtom',
            'maps.tomtom.api_key' => 'test-map-key',
            'maps.tomtom.search_base_url' => 'https://api.tomtom.test/search/2',
            'maps.tomtom.country_set' => 'DO',
        ]);

        Http::fake([
            '*' => Http::response([
                'results' => [
                    [
                        'position' => [
                            'lat' => 18.4861,
                            'lon' => -69.9312,
                        ],
                    ],
                ],
            ], 200),
        ]);

        $result = app(MapServiceInterface::class)
            ->geocode('Santo Domingo');

        $this->assertNotEmpty($result['results']);

        Http::assertSentCount(1);
    }
}
