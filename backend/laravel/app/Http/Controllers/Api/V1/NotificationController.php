<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $query = UserNotification::query()->where('user_id', $request->user()->id)->latest();
        if ($request->boolean('unread')) $query->whereNull('read_at');
        return response()->json([
            'data' => $query->limit(min((int) $request->input('limit', 50), 100))->get(),
            'unread' => UserNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->count(),
        ]);
    }

    public function read(Request $request, UserNotification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 404);
        $notification->forceFill(['read_at' => now()])->save();
        return response()->json(['data' => $notification->fresh()]);
    }

    public function readAll(Request $request)
    {
        UserNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['message' => 'Notifications marked as read.']);
    }
}
