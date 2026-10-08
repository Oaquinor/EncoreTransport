<?php
namespace App\Http\Requests\Api\V1;
use Illuminate\Foundation\Http\FormRequest;
class StoreBookingRequest extends FormRequest {
 public function authorize(): bool { return true; }
 public function rules(): array { return [
  'trip_id'=>['required','integer','exists:trips,id'],
  'seat_ids'=>['required','array','min:1','max:10'],'seat_ids.*'=>['integer','distinct','exists:bus_seats,id'],
  'passengers'=>['required','array','min:1','max:10'],'passengers.*.full_name'=>['required','string','max:150'],
  'passengers.*.document_number'=>['nullable','string','max:64'],'passengers.*.email'=>['nullable','email','max:150'],'passengers.*.phone'=>['nullable','string','max:40'],
 ]; }
}
