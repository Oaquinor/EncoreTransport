<?php

namespace App\Providers;

use App\Contracts\Maps\MapServiceInterface;
use App\Services\Maps\TomTomMapService;
use App\Services\Payments\PaymentGatewayInterface;
use App\Services\Payments\UnconfiguredPaymentGateway;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MapServiceInterface::class, fn()=>match(config('maps.provider')) {
            'tomtom'=>app(TomTomMapService::class),
            default=>throw new \RuntimeException('Unsupported map provider: '.config('maps.provider')),
        });
        $this->app->bind(PaymentGatewayInterface::class, fn()=>match(config('encore.payment_gateway','unconfigured')) {
            'unconfigured'=>app(UnconfiguredPaymentGateway::class),
            default=>throw new \RuntimeException('Payment gateway adapter is not installed for: '.config('encore.payment_gateway')),
        });
    }
    public function boot(): void {}
}
