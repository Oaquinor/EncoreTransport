<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = [
            ['routes.deactivate', 'Deactivate routes', 'routes'],
            ['trips.publish', 'Publish trips', 'trips'],
            ['trips.assign_driver', 'Assign drivers to trips', 'trips'],
            ['trips.assign_vehicle', 'Assign vehicles to trips', 'trips'],
            ['bookings.assign_seat', 'Assign booking seats', 'bookings'],
            ['bookings.refund', 'Refund booking payments', 'bookings'],
            ['drivers.deactivate', 'Deactivate driver profiles', 'drivers'],
            ['incidents.view', 'View incidents', 'incidents'],
            ['incidents.update', 'Update incidents', 'incidents'],
            ['cargo.create', 'Create cargo records', 'cargo'],
            ['cargo.update', 'Update cargo records', 'cargo'],
            ['users.deactivate', 'Deactivate users', 'users'],
            ['roles.create', 'Create roles', 'roles'],
            ['roles.update', 'Update roles', 'roles'],
            ['roles.delete', 'Delete roles', 'roles'],
            ['permissions.view', 'View permission catalog', 'permissions'],
            ['permissions.assign', 'Assign permissions', 'permissions'],
            ['settings.manage_security', 'Manage security settings', 'settings'],
            ['integrations.view', 'View integrations', 'integrations'],
            ['integrations.manage', 'Manage integrations', 'integrations'],
            ['driver.access', 'Use driver operations', 'driver'],
        ];

        $timestamp = now();
        foreach ($permissions as [$key, $label, $resource]) {
            DB::table('permissions')->insertOrIgnore([
                'key' => $key,
                'label' => $label,
                'resource' => $resource,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
        }

        $roleIds = DB::table('roles')->pluck('id', 'name');
        $permissionIds = DB::table('permissions')->pluck('id', 'key');
        $rolePermissions = [
            'superadmin' => array_keys($permissionIds->all()),
            'operations_admin' => [
                'routes.deactivate', 'trips.publish', 'bookings.assign_seat',
                'incidents.view', 'incidents.update',
            ],
            'fleet_admin' => ['drivers.deactivate'],
            'attendant' => ['bookings.assign_seat', 'cargo.create', 'cargo.update'],
            'driver' => ['driver.access'],
        ];

        foreach ($rolePermissions as $role => $keys) {
            if (!isset($roleIds[$role])) continue;

            foreach ($keys as $key) {
                if (!isset($permissionIds[$key])) continue;

                DB::table('permission_role')->insertOrIgnore([
                    'role_id' => $roleIds[$role],
                    'permission_id' => $permissionIds[$key],
                ]);
            }
        }
    }

    public function down(): void
    {
        // Permission rows may have been assigned after this migration. They are
        // intentionally preserved so rollback cannot silently remove access data.
    }
};
