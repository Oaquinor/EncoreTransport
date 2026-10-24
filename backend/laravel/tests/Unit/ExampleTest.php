<?php

namespace Tests\Unit;

use App\Services\Routes\RouteSegmentService;
use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_route_segment_service_is_instantiable(): void
    {
        $this->assertInstanceOf(RouteSegmentService::class, new RouteSegmentService());
    }
}
