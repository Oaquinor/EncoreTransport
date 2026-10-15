<?php

namespace App\Services\Auth;

use App\Models\User;

class PermissionService
{
    public function allows(?User $user, string $permission): bool
    {
        if (!$user || !$user->active) return false;

        $direct = $user->permissions()->where('key', $permission)->first();
        if ($direct) return (bool) $direct->pivot->granted;

        return $user->roles()->whereHas('permissions', fn ($query) => $query->where('key', $permission))->exists();
    }

    public function effective(User $user): array
    {
        $roleKeys = $user->roles()->with('permissions')->get()->flatMap(fn ($role) => $role->permissions->pluck('key'));
        $direct = $user->permissions()->get()->mapWithKeys(fn ($permission) => [$permission->key => (bool) $permission->pivot->granted]);
        $effective = $roleKeys->unique()->mapWithKeys(fn ($key) => [$key => true])->all();
        foreach ($direct as $key => $granted) {
            if ($granted) $effective[$key] = true;
            else unset($effective[$key]);
        }
        return array_values(array_keys($effective));
    }
}
