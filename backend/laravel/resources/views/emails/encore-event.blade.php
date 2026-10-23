<!doctype html>
<html lang="en"><body style="font-family:Arial,sans-serif;color:#102130;line-height:1.5">
  <h1>Encore Transport</h1>
  <p>Your account has a new update: <strong>{{ str_replace('_', ' ', $event) }}</strong>.</p>
  @foreach($payload as $key => $value)
    @if(is_scalar($value))<p><strong>{{ str_replace('_', ' ', $key) }}:</strong> {{ $value }}</p>@endif
  @endforeach
  <p>For help, contact Encore Transport support.</p>
</body></html>
