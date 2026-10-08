<?php
namespace App\Services\Pricing;
use App\Models\Trip;
class PricingService { public function quote(Trip $trip,int $passengerCount):array { $base=(int)$trip->price_per_passenger;$count=max(1,$passengerCount);$subtotal=$base*$count;return ['currency'=>(string)config('encore.currency','DOP'),'base_fare'=>$base,'passengers'=>$count,'fees'=>0,'discounts'=>0,'taxes'=>0,'subtotal'=>$subtotal,'total'=>$subtotal]; } }
