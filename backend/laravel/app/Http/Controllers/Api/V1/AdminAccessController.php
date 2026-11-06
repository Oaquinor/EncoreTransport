<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Permission;
use App\Models\PackageAuthorization;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Audit\AuditService;
use App\Services\Auth\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Carbon;

class AdminAccessController extends Controller
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function users(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'string', 'max:80'],
            'active' => ['nullable', 'in:0,1'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $query = User::query()
            ->with(['roles', 'permissions'])
            ->withCount('bookings')
            ->when($filters['q'] ?? null, function ($query, string $term): void {
                $like = '%' . addcslashes($term, '%_') . '%';
                $query->where(function ($nested) use ($like): void {
                    $nested->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('phone', 'like', $like)
                        ->orWhere('id', ctype_digit($like) ? (int) trim($like, '%') : -1);
                });
            })
            ->when($filters['role'] ?? null, function ($query, string $role): void {
                $query->where(function ($nested) use ($role): void {
                    $nested->where('role', $role)
                        ->orWhereHas('roles', fn ($roles) => $roles->where('name', $role));
                });
            })
            ->when(array_key_exists('active', $filters), fn ($query) => $query->where('active', (bool) $filters['active']))
            ->when($filters['date_from'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->orderBy('name')
            ->orderBy('id');

        $page = $query->paginate((int) ($filters['per_page'] ?? 25));

        return response()->json([
            'data' => $page->getCollection()->map(fn ($user) => $this->userPayload($user))->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function showUser(User $user)
    {
        return response()->json(['data' => $this->userPayload($user->load(['roles.permissions', 'permissions']))]);
    }

    public function userBookings(Request $request, User $user)
    {
        $page = Booking::query()->with(['trip.route', 'trip.bus', 'ticket', 'payments'])
            ->where('user_id', $user->id)->latest()->paginate($this->perPage($request));

        return response()->json(['data' => $page->getCollection()->map(fn ($booking) => [
            'id' => $booking->id,
            'reference' => $booking->reference,
            'status' => $booking->status,
            'total_amount' => $booking->total_amount,
            'confirmed_at' => $booking->confirmed_at,
            'expires_at' => $booking->expires_at,
            'trip' => $booking->trip ? [
                'id' => $booking->trip->id,
                'status' => $booking->trip->status,
                'departure_date' => $booking->trip->departure_date?->toDateString(),
                'departure_time' => $booking->trip->departure_time,
                'route' => $booking->trip->route ? $booking->trip->route->origin . ' → ' . $booking->trip->route->destination : null,
            ] : null,
            'ticket_status' => $booking->ticket?->status,
            'payment_status' => $booking->payments->sortByDesc('id')->first()?->status,
        ])->values(), 'meta' => $this->paginationMeta($page)]);
    }

    public function userTickets(Request $request, User $user)
    {
        $page = Ticket::query()->with(['booking.trip.route', 'booking.payments'])
            ->whereHas('booking', fn ($query) => $query->where('user_id', $user->id))
            ->latest()->paginate($this->perPage($request));

        return response()->json(['data' => $page->getCollection()->map(fn ($ticket) => $this->ticketPayload($ticket))->values(), 'meta' => $this->paginationMeta($page)]);
    }

    public function userPackages(Request $request, User $user)
    {
        $page = PackageAuthorization::query()->with(['package.trip.route', 'package.events'])
            ->where('user_id', $user->id)->where('status', 'authorized')->latest()->paginate($this->perPage($request));

        return response()->json(['data' => $page->getCollection()->map(fn ($authorization) => [
            'authorization_id' => $authorization->id,
            'authorized_at' => $authorization->authorized_at,
            'reference' => $authorization->package?->reference,
            'status' => $authorization->package?->status,
            'route' => $authorization->package?->trip?->route?->origin && $authorization->package?->trip?->route?->destination
                ? $authorization->package->trip->route->origin . ' → ' . $authorization->package->trip->route->destination : null,
            'events' => $authorization->package?->events?->map(fn ($event) => ['status' => $event->status, 'occurred_at' => $event->occurred_at])->values(),
        ])->values(), 'meta' => $this->paginationMeta($page)]);
    }

    public function userActivity(Request $request, User $user)
    {
        $page = AuditLog::query()->where(function ($query) use ($user) {
            $query->where('user_id', $user->id)->orWhere(function ($subject) use ($user) {
                $subject->where('subject_type', User::class)->where('subject_id', (string) $user->id);
            });
        })->latest()->paginate($this->perPage($request));

        return response()->json(['data' => $page->getCollection()->map(fn ($log) => [
            'id' => $log->id, 'action' => $log->action, 'subject_type' => $log->subject_type,
            'subject_id' => $log->subject_id, 'context' => $log->context, 'created_at' => $log->created_at,
        ])->values(), 'meta' => $this->paginationMeta($page)]);
    }

    public function userPermissions(User $user)
    {
        $user->load(['roles.permissions', 'permissions']);
        $directByKey = $user->permissions->keyBy('key');
        $matrix = Permission::query()
            ->orderBy('resource')
            ->orderBy('key')
            ->get()
            ->map(function (Permission $permission) use ($user, $directByKey): array {
                $sources = $user->roles
                    ->filter(fn (Role $role) => $role->permissions->contains('id', $permission->id))
                    ->map(fn (Role $role) => ['name' => $role->name, 'label' => $role->label])
                    ->values();
                $direct = $directByKey->get($permission->key);
                $directState = $direct === null ? 'inherit' : ((bool) $direct->pivot->granted ? 'allow' : 'deny');
                $effective = $direct === null ? $sources->isNotEmpty() : (bool) $direct->pivot->granted;

                return [
                    'key' => $permission->key,
                    'label' => $permission->label,
                    'resource' => $permission->resource,
                    'action' => str_contains($permission->key, '.') ? str($permission->key)->afterLast('.')->toString() : $permission->key,
                    'direct' => $directState,
                    'effective' => $effective,
                    'sources' => $sources,
                ];
            });

        return response()->json(['data' => [
            'roles' => $user->roles,
            'direct' => $user->permissions,
            'effective' => $this->permissions->effective($user),
            'matrix' => $matrix->groupBy('resource')->map(fn ($permissions, $resource) => [
                'resource' => $resource,
                'permissions' => $permissions->values(),
                'effective_count' => $permissions->where('effective', true)->count(),
                'total_count' => $permissions->count(),
            ])->values(),
            'summary' => [
                'roles' => $user->roles->count(),
                'total' => $matrix->count(),
                'effective' => $matrix->where('effective', true)->count(),
                'direct' => $matrix->where('direct', '!=', 'inherit')->count(),
                'denied' => $matrix->where('direct', 'deny')->count(),
            ],
        ]]);
    }

    public function previewUserAccess(Request $request, User $user)
    {
        $data = $request->validate([
            'source_user_id' => ['required', 'integer', 'exists:users,id', 'different:' . $user->id],
            'include_roles' => ['sometimes', 'boolean'],
            'include_direct' => ['sometimes', 'boolean'],
        ]);
        $source = User::query()->with(['roles', 'permissions'])->findOrFail($data['source_user_id']);
        $includeRoles = $data['include_roles'] ?? true;
        $includeDirect = $data['include_direct'] ?? true;
        $user->load(['roles', 'permissions']);

        $targetRoles = $user->roles->keyBy('id');
        $sourceRoles = $source->roles->keyBy('id');
        $targetDirect = $user->permissions->keyBy('key');
        $sourceDirect = $source->permissions->keyBy('key');

        return response()->json(['data' => [
            'source' => ['id' => $source->id, 'name' => $source->name, 'email' => $source->email],
            'target' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
            'roles' => $includeRoles ? [
                'add' => $sourceRoles->diffKeys($targetRoles)->values()->map(fn (Role $role) => ['name' => $role->name, 'label' => $role->label]),
                'remove' => $targetRoles->diffKeys($sourceRoles)->values()->map(fn (Role $role) => ['name' => $role->name, 'label' => $role->label]),
            ] : ['add' => [], 'remove' => []],
            'direct' => $includeDirect ? [
                'add' => $sourceDirect->diffKeys($targetDirect)->values()->map(fn (Permission $permission) => ['key' => $permission->key, 'label' => $permission->label, 'granted' => (bool) $permission->pivot->granted]),
                'remove' => $targetDirect->diffKeys($sourceDirect)->values()->map(fn (Permission $permission) => ['key' => $permission->key, 'label' => $permission->label]),
                'change' => $sourceDirect->intersectByKeys($targetDirect)->filter(fn (Permission $permission, string $key) => (bool) $permission->pivot->granted !== (bool) $targetDirect[$key]->pivot->granted)->values()->map(fn (Permission $permission) => ['key' => $permission->key, 'label' => $permission->label, 'granted' => (bool) $permission->pivot->granted]),
            ] : ['add' => [], 'remove' => [], 'change' => []],
        ]]);
    }

    public function copyUserAccess(Request $request, User $user, AuditService $audit)
    {
        $data = $request->validate([
            'source_user_id' => ['required', 'integer', 'exists:users,id', 'different:' . $user->id],
            'include_roles' => ['sometimes', 'boolean'],
            'include_direct' => ['sometimes', 'boolean'],
        ]);
        $this->assertAccessCopyAllowed($request, $data);
        $source = User::query()->with(['roles.permissions', 'permissions'])->findOrFail($data['source_user_id']);
        $includeRoles = $data['include_roles'] ?? true;
        $includeDirect = $data['include_direct'] ?? true;

        DB::transaction(function () use ($user, $source, $includeRoles, $includeDirect, $request, $audit): void {
            if ($includeRoles) $user->roles()->sync($source->roles->modelKeys());
            if ($includeDirect) {
                $user->permissions()->sync($source->permissions->mapWithKeys(fn (Permission $permission) => [
                    $permission->id => ['granted' => (bool) $permission->pivot->granted, 'assigned_by_user_id' => $request->user()->id],
                ])->all());
            }
            $audit->record($request->user(), 'user.access_copied', $user, [
                'source_user_id' => $source->id,
                'include_roles' => $includeRoles,
                'include_direct' => $includeDirect,
            ]);
        });

        return response()->json(['data' => $this->userPayload($user->fresh(['roles', 'permissions']))]);
    }

    public function storeUser(Request $request, AuditService $audit)
    {
        $data = $request->validate($this->userRules());
        $this->assertAccessChangesAllowed($request, $data);
        $user = DB::transaction(function () use ($data, $request, $audit): User {
            $user = User::query()->create([
                'name' => $data['name'], 'email' => mb_strtolower($data['email']),
                'phone' => $data['phone'] ?? null, 'role' => $data['role'] ?? 'passenger',
                'active' => $data['active'] ?? true, 'password' => Hash::make($data['password']),
            ]);
            $this->syncAccess($user, $data, $request->user());
            $audit->record($request->user(), 'user.created', $user, ['roles' => $data['role_ids'] ?? []]);
            return $user;
        });
        return response()->json(['data' => $this->userPayload($user->fresh(['roles','permissions']))], 201);
    }

    public function updateUser(Request $request, User $user, AuditService $audit)
    {
        $rules = $this->userRules($user);
        $data = $request->validate($rules);
        $this->assertAccessChangesAllowed($request, $data);
        $before = $this->accessSnapshot($user);
        DB::transaction(function () use ($data, $user, $request, $audit, $before): void {
            $user->fill(array_filter($data, fn ($key) => in_array($key, ['name','email','phone','role','active'], true), ARRAY_FILTER_USE_KEY))->save();
            if (!empty($data['password'])) {
                $user->forceFill(['password' => Hash::make($data['password'])])->save();
                ApiToken::query()->where('user_id', $user->id)->delete();
            }
            $this->syncAccess($user, $data, $request->user());
            $after = $this->accessSnapshot($user->fresh(['roles', 'permissions']));
            $audit->record($request->user(), 'user.updated', $user, ['access_changes' => $this->accessDiff($before, $after), 'password_rotated' => !empty($data['password'])]);
        });
        return response()->json(['data' => $this->userPayload($user->fresh(['roles','permissions']))]);
    }

    public function disableUser(Request $request, User $user, AuditService $audit)
    {
        if ($request->user()->is($user)) return response()->json(['message' => 'You cannot disable your own account.'], 422);
        DB::transaction(function () use ($user, $request, $audit): void {
            $user->update(['active' => false]);
            ApiToken::query()->where('user_id', $user->id)->delete();
            $audit->record($request->user(), 'user.disabled', $user);
        });
        return response()->json(['data' => $this->userPayload($user->fresh(['roles','permissions']))]);
    }

    public function roles() { return response()->json(['data' => Role::query()->with('permissions')->withCount('users')->orderBy('name')->get()->map(fn (Role $role) => array_merge($role->toArray(), ['permission_count' => $role->permissions->count(), 'user_count' => $role->users_count]))]); }
    public function permissions() { return response()->json(['data' => Permission::query()->orderBy('resource')->orderBy('key')->get()->map(fn (Permission $permission) => $permission->setAttribute('action', str_contains($permission->key, '.') ? str($permission->key)->afterLast('.')->toString() : $permission->key))]); }

    public function updateRole(Request $request, Role $role, AuditService $audit)
    {
        $data = $request->validate(['label' => ['required','string','max:120'], 'permission_keys' => ['sometimes','array'], 'permission_keys.*' => ['string','exists:permissions,key']]);
        if ($role->system && !$this->isSystemAdministrator($request->user())) abort(403, 'Only a system administrator can change system roles.');
        if (array_key_exists('permission_keys', $data) && !$this->isSystemAdministrator($request->user())) {
            foreach ($data['permission_keys'] as $key) {
                if (!$this->permissions->allows($request->user(), $key)) abort(403, 'You cannot grant a permission you do not hold.');
            }
        }
        $before = $role->permissions()->pluck('permissions.key')->values()->all();
        DB::transaction(function () use ($role, $data, $request, $audit, $before): void {
            $role->update(['label' => $data['label']]);
            if (array_key_exists('permission_keys', $data)) $role->permissions()->sync(Permission::query()->whereIn('key', $data['permission_keys'])->pluck('id'));
            $audit->record($request->user(), 'role.updated', $role, [
                'permissions_before' => $before,
                'permissions_after' => array_values($data['permission_keys'] ?? $before),
            ]);
        });
        return response()->json(['data' => $role->fresh('permissions')]);
    }

    private function userRules(?User $user = null): array
    {
        return [
            'name' => ['required','string','max:150'],
            'email' => ['required','email','max:190', Rule::unique('users','email')->ignore($user?->id)],
            'phone' => ['nullable','string','max:40'],
            'role' => ['sometimes','string','max:80', Rule::exists('roles', 'name')],
            'active' => ['sometimes','boolean'],
            'password' => [$user ? 'nullable' : 'required', Password::min(8)->letters()->numbers()],
            'role_ids' => ['sometimes','array'], 'role_ids.*' => ['integer','exists:roles,id'],
            'permission_grants' => ['sometimes','array'], 'permission_grants.*' => ['nullable','boolean'],
        ];
    }

    private function assertAccessChangesAllowed(Request $request, array $data): void
    {
        $actor = $request->user();
        if (!$actor) abort(401);

        if (array_key_exists('role_ids', $data) && !$this->permissions->allows($actor, 'roles.manage')) {
            abort(403, 'Role assignment requires roles.manage.');
        }

        if (array_key_exists('role_ids', $data) && !$this->isSystemAdministrator($actor)) {
            $assignedRoles = Role::query()->with('permissions')->whereIn('id', $data['role_ids'])->get();
            if ($assignedRoles->contains(fn ($role) => $role->name === 'superadmin')) {
                abort(403, 'Only a system administrator can assign system administrator access.');
            }
            foreach ($assignedRoles->flatMap(fn ($role) => $role->permissions)->unique('key') as $permission) {
                if (!$this->permissions->allows($actor, $permission->key)) {
                    abort(403, 'You cannot assign a role that grants permissions you do not hold.');
                }
            }
        }

        if (($data['role'] ?? null) === 'superadmin' && !$this->isSystemAdministrator($actor)) {
            abort(403, 'Only a system administrator can assign superadmin access.');
        }

        if (!array_key_exists('permission_grants', $data)) return;
        if (!$this->permissions->allows($actor, 'permissions.assign')) {
            abort(403, 'Direct permission assignment requires permissions.assign.');
        }

        if ($this->isSystemAdministrator($actor)) return;

        $knownKeys = Permission::query()->whereIn('key', array_keys($data['permission_grants']))->pluck('key')->all();
        foreach ($data['permission_grants'] as $key => $granted) {
            if (!in_array($key, $knownKeys, true)) {
                abort(422, 'Unknown permission key.');
            }
            if ($granted && !$this->permissions->allows($actor, (string) $key)) {
                abort(403, 'You cannot grant a permission you do not hold.');
            }
        }
    }

    private function syncAccess(User $user, array $data, ?User $actor = null): void
    {
        if (array_key_exists('role_ids', $data)) $user->roles()->sync($data['role_ids']);
        if (array_key_exists('permission_grants', $data)) {
            $rows = [];
            $permissions = Permission::query()->whereIn('key', array_keys($data['permission_grants']))->get()->keyBy('key');
            foreach ($data['permission_grants'] as $key => $granted) {
                if ($granted === null) continue;
                $permission = $permissions->get($key);
                if ($permission) $rows[$permission->id] = ['granted' => (bool) $granted, 'assigned_by_user_id' => $actor?->id];
            }
            $user->permissions()->sync($rows);
        }
    }

    private function assertAccessCopyAllowed(Request $request, array $data): void
    {
        $actor = $request->user();
        $includeRoles = $data['include_roles'] ?? true;
        $includeDirect = $data['include_direct'] ?? true;
        if ($includeRoles && !$this->permissions->allows($actor, 'roles.manage')) {
            abort(403, 'Copying role access requires roles.manage.');
        }
        if ($includeDirect && !$this->permissions->allows($actor, 'permissions.assign')) {
            abort(403, 'Copying direct permissions requires permissions.assign.');
        }
        if ($this->isSystemAdministrator($actor)) return;

        $source = User::query()->with(['roles.permissions', 'permissions'])->findOrFail($data['source_user_id']);
        $keys = collect();
        if ($includeRoles) $keys = $keys->merge($source->roles->flatMap(fn (Role $role) => $role->permissions->pluck('key')));
        if ($includeDirect) $keys = $keys->merge($source->permissions->filter(fn (Permission $permission) => (bool) $permission->pivot->granted)->pluck('key'));
        foreach ($keys->unique() as $key) {
            if (!$this->permissions->allows($actor, (string) $key)) abort(403, 'You cannot copy access you do not hold.');
        }
    }

    private function accessSnapshot(User $user): array
    {
        $user->load(['roles', 'permissions']);
        return [
            'roles' => $user->roles->pluck('name')->sort()->values()->all(),
            'direct' => $user->permissions->mapWithKeys(fn (Permission $permission) => [$permission->key => (bool) $permission->pivot->granted])->all(),
        ];
    }

    private function accessDiff(array $before, array $after): array
    {
        return [
            'roles_added' => array_values(array_diff($after['roles'], $before['roles'])),
            'roles_removed' => array_values(array_diff($before['roles'], $after['roles'])),
            'direct_changed' => collect(array_unique(array_merge(array_keys($before['direct']), array_keys($after['direct']))))
                ->filter(fn (string $key) => ($before['direct'][$key] ?? null) !== ($after['direct'][$key] ?? null))
                ->mapWithKeys(fn (string $key) => [$key => ['from' => $before['direct'][$key] ?? null, 'to' => $after['direct'][$key] ?? null]])
                ->all(),
        ];
    }

    private function isSystemAdministrator(?User $user): bool
    {
        return $user !== null
            && $user->active
            && $this->permissions->allows($user, 'roles.manage')
            && $this->permissions->allows($user, 'permissions.assign');
    }

    private function userPayload(User $user): array
    {
        return ['id'=>$user->id,'name'=>$user->name,'email'=>$user->email,'phone'=>$user->phone,'role'=>$user->role,'active'=>(bool)$user->active,'created_at'=>$user->created_at,'booking_count'=>$user->bookings_count ?? $user->bookings()->count(),'roles'=>$user->roles,'direct_permissions'=>$user->permissions,'permissions'=>app(\App\Services\Auth\PermissionService::class)->effective($user)];
    }

    private function ticketPayload(Ticket $ticket): array
    {
        $booking = $ticket->booking;
        $trip = $booking?->trip;
        $departure = $trip?->departure_date && $trip?->departure_time
            ? Carbon::parse($trip->departure_date->toDateString() . ' ' . $trip->departure_time)
            : null;
        $lifecycle = $ticket->status;
        if ($ticket->status === 'active') {
            $lifecycle = $departure && $departure->isPast() ? 'not_used' : 'valid';
        }

        return [
            'id' => $ticket->id,
            'public_id' => $ticket->public_id,
            'status' => $ticket->status,
            'lifecycle_status' => $lifecycle,
            'issued_at' => $ticket->issued_at,
            'validated_at' => $ticket->validated_at,
            'used_at' => $ticket->used_at,
            'booking_status' => $booking?->status,
            'payment_status' => $booking?->payments?->sortByDesc('id')->first()?->status,
            'boarding_status' => $ticket->used_at ? 'boarded' : 'not_boarded',
            'booking' => $booking ? ['id' => $booking->id, 'reference' => $booking->reference] : null,
            'trip' => $trip ? ['id' => $trip->id, 'status' => $trip->status, 'departure_date' => $trip->departure_date?->toDateString(), 'departure_time' => $trip->departure_time, 'route' => $trip->route ? $trip->route->origin . ' → ' . $trip->route->destination : null] : null,
        ];
    }

    private function perPage(Request $request): int
    {
        return min(100, max(10, (int) $request->input('per_page', 25)));
    }

    private function paginationMeta($page): array
    {
        return ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()];
    }
}
