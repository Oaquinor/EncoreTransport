<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
            $table->string('label', 120);
            $table->boolean('system')->default(false);
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key', 120)->unique();
            $table->string('label', 160);
            $table->string('resource', 80);
            $table->timestamps();
        });

        Schema::create('role_user', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['role_id', 'user_id']);
        });

        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->primary(['permission_id', 'role_id']);
        });

        Schema::create('permission_user', function (Blueprint $table) {
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('granted')->default(true);
            $table->foreignId('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->primary(['permission_id', 'user_id']);
        });

        $permissions = [
            ['dashboard.view', 'View dashboard', 'dashboard'],
            ['routes.view', 'View routes', 'routes'], ['routes.create', 'Create routes', 'routes'], ['routes.update', 'Update routes', 'routes'],
            ['trips.view', 'View trips', 'trips'], ['trips.create', 'Create trips', 'trips'], ['trips.update', 'Update trips', 'trips'], ['trips.cancel', 'Cancel trips', 'trips'], ['trips.assign_driver', 'Assign drivers', 'trips'], ['trips.assign_vehicle', 'Assign vehicles', 'trips'],
            ['schedules.view', 'View schedules', 'schedules'], ['schedules.manage', 'Manage schedules', 'schedules'],
            ['vehicles.view', 'View vehicles', 'vehicles'], ['vehicles.create', 'Create vehicles', 'vehicles'], ['vehicles.update', 'Update vehicles', 'vehicles'],
            ['drivers.view', 'View drivers', 'drivers'], ['drivers.create', 'Create drivers', 'drivers'], ['drivers.update', 'Update drivers', 'drivers'],
            ['bookings.view', 'View bookings', 'bookings'], ['bookings.create', 'Create bookings', 'bookings'], ['bookings.update', 'Update bookings', 'bookings'], ['bookings.cancel', 'Cancel bookings', 'bookings'], ['bookings.issue_ticket', 'Issue tickets', 'bookings'],
            ['tickets.view', 'View tickets', 'tickets'], ['tickets.validate', 'Validate tickets', 'tickets'],
            ['payments.view', 'View payments', 'payments'], ['payments.create', 'Record payments', 'payments'], ['payments.refund', 'Refund payments', 'payments'],
            ['cash.view', 'View cash operations', 'cash'], ['cash.manage', 'Manage cash operations', 'cash'],
            ['cargo.view', 'View cargo', 'cargo'], ['cargo.manage', 'Manage cargo', 'cargo'],
            ['reports.view', 'View reports', 'reports'], ['reports.export', 'Export reports', 'reports'],
            ['users.view', 'View users', 'users'], ['users.create', 'Create users', 'users'], ['users.update', 'Update users', 'users'], ['users.disable', 'Disable users', 'users'],
            ['roles.view', 'View roles', 'roles'], ['roles.manage', 'Manage roles', 'roles'],
            ['settings.view', 'View settings', 'settings'], ['settings.update', 'Update settings', 'settings'], ['settings.manage_integrations', 'Manage integrations', 'settings'],
            ['audit.view', 'View audit logs', 'audit'],
        ];

        $timestamp = now();
        foreach ($permissions as [$key, $label, $resource]) {
            DB::table('permissions')->insertOrIgnore([
                'key' => $key, 'label' => $label, 'resource' => $resource,
                'created_at' => $timestamp, 'updated_at' => $timestamp,
            ]);
        }

        $roles = [
            ['superadmin', 'System administrator', true],
            ['operations_admin', 'Operations administrator', true],
            ['fleet_admin', 'Fleet administrator', true],
            ['finance_admin', 'Finance administrator', true],
            ['attendant', 'Attendant', true],
            ['driver', 'Driver', true],
            ['passenger', 'Passenger', true],
        ];
        foreach ($roles as [$name, $label, $system]) {
            DB::table('roles')->insertOrIgnore([
                'name' => $name, 'label' => $label, 'system' => $system,
                'created_at' => $timestamp, 'updated_at' => $timestamp,
            ]);
        }

        $roleIds = DB::table('roles')->pluck('id', 'name');
        $permissionIds = DB::table('permissions')->pluck('id', 'key');
        $rolePermissions = [
            'superadmin' => array_keys($permissionIds->all()),
            'operations_admin' => ['dashboard.view', 'routes.view', 'routes.create', 'routes.update', 'trips.view', 'trips.create', 'trips.update', 'trips.cancel', 'trips.assign_driver', 'trips.assign_vehicle', 'schedules.view', 'schedules.manage', 'bookings.view', 'bookings.create', 'bookings.update', 'bookings.cancel', 'tickets.view', 'tickets.validate', 'reports.view'],
            'fleet_admin' => ['dashboard.view', 'routes.view', 'vehicles.view', 'vehicles.create', 'vehicles.update', 'drivers.view', 'drivers.create', 'drivers.update', 'schedules.view', 'schedules.manage', 'reports.view'],
            'finance_admin' => ['dashboard.view', 'bookings.view', 'payments.view', 'payments.create', 'payments.refund', 'cash.view', 'cash.manage', 'reports.view', 'reports.export'],
            'attendant' => ['trips.view', 'bookings.view', 'bookings.create', 'bookings.cancel', 'tickets.view', 'tickets.validate', 'payments.view', 'payments.create', 'cash.view', 'cash.manage', 'cargo.view', 'cargo.manage'],
            'driver' => ['trips.view', 'tickets.validate', 'cargo.view', 'cargo.manage'],
            'passenger' => ['bookings.view', 'bookings.create', 'bookings.cancel', 'tickets.view'],
        ];
        foreach ($rolePermissions as $role => $keys) {
            foreach ($keys as $key) {
                if (isset($roleIds[$role], $permissionIds[$key])) {
                    DB::table('permission_role')->insertOrIgnore(['role_id' => $roleIds[$role], 'permission_id' => $permissionIds[$key]]);
                }
            }
        }

        $users = DB::table('users')->get(['id', 'role']);
        foreach ($users as $user) {
            $role = $user->role === 'admin' ? 'superadmin' : $user->role;
            if (isset($roleIds[$role])) {
                DB::table('role_user')->insertOrIgnore(['role_id' => $roleIds[$role], 'user_id' => $user->id, 'created_at' => $timestamp, 'updated_at' => $timestamp]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_user');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('role_user');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
