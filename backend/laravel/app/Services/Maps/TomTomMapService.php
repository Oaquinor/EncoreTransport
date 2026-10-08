<?php
namespace App\Services\Maps;
use App\Contracts\Maps\MapServiceInterface;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;
class TomTomMapService implements MapServiceInterface {
 public function search(string $query,array $options=[]):array { $r=$this->client()->get(rtrim((string)config('maps.tomtom.search_base_url'),'/').'/search/'.rawurlencode($query).'.json',array_filter(['key'=>$this->apiKey(),'limit'=>$options['limit']??10,'countrySet'=>$options['country_set']??config('maps.tomtom.country_set'),'language'=>$options['language']??config('maps.tomtom.language'),'lat'=>$options['lat']??null,'lon'=>$options['lon']??null],fn($v)=>$v!==null&&$v!==''));$r->throw();return $r->json(); }
 public function geocode(string $address,array $options=[]):array { $r=$this->client()->get(rtrim((string)config('maps.tomtom.search_base_url'),'/').'/geocode/'.rawurlencode($address).'.json',array_filter(['key'=>$this->apiKey(),'limit'=>$options['limit']??5,'countrySet'=>$options['country_set']??config('maps.tomtom.country_set'),'language'=>$options['language']??config('maps.tomtom.language')],fn($v)=>$v!==null&&$v!==''));$r->throw();return $r->json(); }
 public function reverseGeocode(float $latitude,float $longitude,array $options=[]):array { $r=$this->client()->get(rtrim((string)config('maps.tomtom.search_base_url'),'/').'/reverseGeocode/'.$latitude.','.$longitude.'.json',['key'=>$this->apiKey(),'language'=>$options['language']??config('maps.tomtom.language'),'returnSpeedLimit'=>'false']);$r->throw();return $r->json(); }
 public function calculateRoute(float $originLatitude,float $originLongitude,float $destinationLatitude,float $destinationLongitude,array $options=[]):array { $locations=$originLatitude.','.$originLongitude.':'.$destinationLatitude.','.$destinationLongitude;$r=$this->client()->get(rtrim((string)config('maps.tomtom.routing_base_url'),'/').'/calculateRoute/'.$locations.'/json',['key'=>$this->apiKey(),'routeType'=>$options['route_type']??'fastest','traffic'=>($options['traffic']??true)?'true':'false','travelMode'=>$options['travel_mode']??'car','instructionsType'=>'text','language'=>$options['language']??config('maps.tomtom.language')]);$r->throw();return $r->json(); }
 private function client():PendingRequest { return Http::acceptJson()->timeout((int)config('maps.tomtom.timeout',15))->retry(2,250,throw:false); }
 private function apiKey():string { $key=trim((string)config('maps.tomtom.api_key'));if($key==='')throw new RuntimeException('TOMTOM_API_KEY is not configured.');return $key; }
}
