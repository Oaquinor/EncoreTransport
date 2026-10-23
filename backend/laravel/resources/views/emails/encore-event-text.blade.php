Encore Transport

Update: {{ str_replace('_', ' ', $event) }}
@foreach($payload as $key => $value)
@if(is_scalar($value)){{ str_replace('_', ' ', $key) }}: {{ $value }}
@endif
@endforeach
