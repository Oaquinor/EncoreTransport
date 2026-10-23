<?php

namespace App\Services\Assistant;

use App\Contracts\Assistant\AssistantTool;
use App\Models\User;
use App\Services\Routes\RouteSegmentService;
use App\Models\Trip;
use App\Models\TransportPackage;

class ToolRegistry
{
    /** @var array<string, AssistantTool> */
    private array $tools;

    public function __construct()
    {
        $this->tools = [
            'searchTrips' => new class(app(RouteSegmentService::class)) implements AssistantTool {
                public function __construct(private readonly RouteSegmentService $segments) {}
                public function name(): string { return 'searchTrips'; }
                public function description(): string { return 'Search available trips and segment fares.'; }
                public function risk(): string { return AssistantToolPolicy::READ; }
                public function requiredPermission(): ?string { return null; }
                public function execute(User $user, array $input): array {
                    $trips = Trip::query()->with(['route.stops','bus'])->whereIn('status',['scheduled','boarding'])->get()->filter(function ($trip) use ($input) { try { $this->segments->resolve($trip->route, $input['origin'] ?? null, $input['destination'] ?? null); return true; } catch (\Throwable) { return false; } });
                    return ['items'=>$trips->map(fn($trip)=>['id'=>$trip->id,'origin'=>$trip->route?->origin,'destination'=>$trip->route?->destination,'date'=>$trip->departure_date?->toDateString(),'departure_time'=>$trip->departure_time])->values()->all()];
                }
            },
            'getMyBooking' => new class implements AssistantTool {
                public function name(): string { return 'getMyBooking'; }
                public function description(): string { return 'View the authenticated passenger bookings.'; }
                public function risk(): string { return AssistantToolPolicy::READ; }
                public function requiredPermission(): ?string { return 'bookings.view'; }
                public function execute(User $user, array $input): array { return ['items'=>$user->bookings()->with(['trip.route','ticket'])->latest()->limit(20)->get()->toArray()]; }
            },
            'trackPackage' => new class implements AssistantTool {
                public function name(): string { return 'trackPackage'; }
                public function description(): string { return 'Track a package by public tracking token.'; }
                public function risk(): string { return AssistantToolPolicy::READ; }
                public function requiredPermission(): ?string { return null; }
                public function execute(User $user, array $input): array { $package = TransportPackage::query()->where('tracking_token_hash', hash('sha256', (string)($input['token'] ?? '')))->with('events')->first(); return ['package'=>$package?->makeHidden(['tracking_token_hash','recipient_phone','recipient_email'])]; }
            },
        ];
    }

    public function get(string $name): AssistantTool { return $this->tools[$name] ?? throw new \InvalidArgumentException('Unknown Assistant tool.'); }
    public function definitions(): array { return array_values(array_map(fn($tool)=>['name'=>$tool->name(),'description'=>$tool->description(),'risk'=>$tool->risk(),'requiredPermission'=>$tool->requiredPermission()], $this->tools)); }
}
