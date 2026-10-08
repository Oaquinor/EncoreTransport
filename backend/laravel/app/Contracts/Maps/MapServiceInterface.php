<?php

namespace App\Contracts\Maps;

interface MapServiceInterface
{
    public function search(string $query, array $options = []): array;

    public function geocode(string $address, array $options = []): array;

    public function reverseGeocode(float $latitude, float $longitude, array $options = []): array;

    public function calculateRoute(float $originLatitude, float $originLongitude, float $destinationLatitude, float $destinationLongitude, array $options = []): array;
}
