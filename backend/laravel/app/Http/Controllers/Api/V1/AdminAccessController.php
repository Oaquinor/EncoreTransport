<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit\AuditService;
use App\Services\Auth\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminAccessController extends Controller
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function users()
    {
        return response()->json(['data' => User::query()->with(['roles','permissions'])->orderBy('name')->get()->map(fn ($user) => $this->userPayload($user))]);
    }

    public function storeUser(Request $request, AuditService $audit)
    {
        $data = $request->validate($this->userRules());
        $this->assertAccessChangesAllowed($request, $data);
        $user = User::query()->create([
            'name' => $data['name'], 'email' => mb_strtolower($data['email']),
            'phone' => $data['phone'] ?? null, 'role' => $data['role'] ?? 'passenger',
            'active' => $data['active'] ?? true, 'password' => Hash::make($data['password']),
        ]);
        $this->syncAccess($user, $data);
        $audit->record($request->user(), 'user.created', $user);
        return response()->json(['data' => $this->userPayload($user->fresh(['roles','permissions']))], 201);
    }

    public function updateUser(Request $request, User $user, AuditService $audit)
    {
        $rules = $this->userRules($user);
        $data = $request->validate($rules);
        $this->assertAccessChangesAllowed($request, $data);
        $user->fill(array_filter($data, fn ($key) => in_array($key, ['name','email','phone','role','active'], true), ARRAY_FILTER_USE_KEY))->save();
        if (!empty($data['password'])) {
            $user->forceFill(['password' => Hash::make($data['password'])])->save();
            ApiToken::query()->where('user_id', $user->id)->delete();
        }
        $this->syncAccess($user, $data);
        $audit->record($request->user(), 'user.updated', $user);
        return response()->json(['data' => $this->userPayload($user->fresh(['roles','permissions']))]);
    }

    public function disableUser(Request $request, User $user, AuditService $audit)
    {
        if ($request->user()->is($user)) return response()->json(['message' => 'You cannot disable your own account.'], 422);
        $user->update(['active' => false]);
        ApiToken::query()->where('user_id', $user->id)->delete();
        $audit->record($request->user(), 'user.disabled', $user);
        return response()->json(['data' => $this->userPayload($user->fresh(['roles','permissions']))]);
    }

    public function roles() { return response()->json(['data' => Role::query()->with('permissions')->orderBy('name')->get()]); }
    public function permissions() { return response()->json(['data' => Permission::query()->orderBy('resource')->orderBy('key')->get()]); }

    public function updateRole(Request $request, Role $role, AuditService $audit)
    {
        $data = $request->validate(['label' => ['required','string','max:120'], 'permission_keys' => ['sometimes','array'], 'permission_keys.*' => ['string','exists:permissions,key']]);
        if ($role->system && !$this->isSystemAdministrator($request->user())) abort(403, 'Only a system administrator can change system roles.');
        if (array_key_exists('permission_keys', $data) && !$this->isSystemAdministrator($request->user())) {
            foreach ($data['permission_keys'] as $key) {
                if (!$this->permissions->allows($request->user(), $key)) abort(403, 'You cannot grant a permission you do not hold.');
            }
        }
        $role->update(['label' => $data['label']]);
        if (array_key_exists('permission_keys', $data)) $role->permissions()->sync(Permission::query()->whereIn('key', $data['permission_keys'])->pluck('id'));
        $audit->record($request->user(), 'role.updated', $role);
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
            'permission_grants' => ['sometimes','array'], 'permission_grants.*' => ['boolean'],
        ];
    }

    private function assertAccessChangesAllowed(Request $request, array $data): void
    {
        $actor = $request->user();
        if (!$actor) abort(401);

        if (array_key_exists('role_ids', $data) && !$this->permissions->allows($actor, 'roles.manage')) {
            abort(403, 'Role assignment requires roles.manage.');
        }

        if (($data['role'] ?? null) === 'superadmin' && !$this->isSystemAdministrator($actor)) {
            abort(403, 'Only a system administrator can assign superadmin access.');
        }

        if (!array_key_exists('permission_grants', $data)) return;
        if (!$this->permissions->allows($actor, 'permissions.assign')) {
            abort(403, 'Direct permission assignment requires permissions.assign.');
        }

        if ($this->isSystemAdministrator($actor)) return;

        foreach ($data['permission_grants'] as $key => $granted) {
            if ($granted && !$this->permissions->allows($actor, (string) $key)) {
                abort(403, 'You cannot grant a permission you do not hold.');
            }
        }
    }

    private function syncAccess(User $user, array $data): void
    {
        if (array_key_exists('role_ids', $data)) $user->roles()->sync($data['role_ids']);
        if (array_key_exists('permission_grants', $data)) {
            $rows = [];
            foreach ($data['permission_grants'] as $key => $granted) {
                $permission = Permission::query()->where('key', $key)->first();
                if ($permission) $rows[$permission->id] = ['granted' => (bool) $granted];
            }
            $user->permissions()->sync($rows);
        }
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
        return ['id'=>$user->id,'name'=>$user->name,'email'=>$user->email,'phone'=>$user->phone,'role'=>$user->role,'active'=>(bool)$user->active,'roles'=>$user->roles,'direct_permissions'=>$user->permissions,'permissions'=>app(\App\Services\Auth\PermissionService::class)->effective($user)];
    }
}
