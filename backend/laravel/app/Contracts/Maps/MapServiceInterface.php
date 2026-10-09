<?php

namespace App\Contracts\Maps;

interface MapServiceInterface
{
    public function search(string $query, array $options = []): array;

    public function geocode(string $address, array $options = []): array;

    public function reverseGeocode(float $latitude, float $longitude, array $options = []): array;

    public function calculateRoute(
        float $originLatitude,
        float $originLongitude,
        float $destinationLatitude,
        float $destinationLongitude,
        array $options = []
    ): array;

    /**
     * Returns a real TomTom raster tile payload without exposing the API key
     * to browser clients.
     *
     * @return array{body:string,content_type:string,cache_control:string,etag:?string}
     */
    public function rasterTile(int $zoom, int $x, int $y, array $options = []): array;
}
