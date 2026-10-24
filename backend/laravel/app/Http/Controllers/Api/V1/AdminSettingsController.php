<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSettingsController extends Controller
{
    public function show()
    {
        $settings = DB::table('app_settings')->whereIn('key', ['mail.from_address', 'mail.from_name'])->pluck('value', 'key');
        $fromAddress = $settings->get('mail.from_address') ?: config('mail.from.address');
        $fromName = $settings->get('mail.from_name') ?: config('mail.from.name');
        $gmailReady = config('services.google.gmail.client_id')
            && config('services.google.gmail.client_secret')
            && config('services.google.gmail.refresh_token')
            && config('mail.default') === 'gmail_api';

        return response()->json(['data' => [
            'mail_from_address' => $fromAddress,
            'mail_from_name' => $fromName,
            'gmail_api_ready' => (bool) $gmailReady,
        ]]);
    }

    public function updateEmail(Request $request)
    {
        $data = $request->validate([
            'mail_from_address' => ['required', 'email:rfc', 'max:254'],
            'mail_from_name' => ['required', 'string', 'max:120'],
        ]);

        foreach (['mail.from_address' => $data['mail_from_address'], 'mail.from_name' => $data['mail_from_name']] as $key => $value) {
            DB::table('app_settings')->updateOrInsert(['key' => $key], ['value' => $value, 'updated_at' => now(), 'created_at' => now()]);
        }

        return $this->show();
    }
}
