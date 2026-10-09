<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('bus_seats')) {
            Schema::table('bus_seats', function (Blueprint $table) {
                if (!Schema::hasColumn('bus_seats', 'row_number')) $table->unsignedSmallInteger('row_number')->nullable()->after('seat_number');
                if (!Schema::hasColumn('bus_seats', 'position_index')) $table->unsignedSmallInteger('position_index')->nullable()->after('row_number');
                if (!Schema::hasColumn('bus_seats', 'seat_type')) $table->string('seat_type', 32)->default('seat')->after('seat_class');
                if (!Schema::hasColumn('bus_seats', 'accessible')) $table->boolean('accessible')->default(false)->after('aisle');
                if (!Schema::hasColumn('bus_seats', 'blocked')) $table->boolean('blocked')->default(false)->after('accessible');
            });
            $seats = DB::table('bus_seats')->select('id','seat_number')->whereNull('row_number')->orWhereNull('position_index')->get();
            foreach ($seats as $seat) {
                if (!preg_match('/^(\d+)([A-Za-z])$/', (string) $seat->seat_number, $m)) continue;
                $letter = strtoupper($m[2]);
                $position = ['A'=>1,'B'=>2,'C'=>4,'D'=>5][$letter] ?? null;
                if (!$position) continue;
                DB::table('bus_seats')->where('id',$seat->id)->update(['row_number'=>(int)$m[1],'position_index'=>$position]);
            }
        }

        if (!Schema::hasTable('driver_schedules')) {
            Schema::create('driver_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
                $table->foreignId('bus_id')->nullable()->constrained('buses')->nullOnDelete();
                $table->foreignId('trip_id')->nullable()->constrained('trips')->nullOnDelete();
                $table->date('work_date');
                $table->time('starts_at');
                $table->time('ends_at');
                $table->string('status',24)->default('scheduled');
                $table->text('notes')->nullable();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['driver_id','work_date']);
                $table->index(['work_date','status']);
            });
        }

        if (!Schema::hasTable('vehicle_status_reports')) {
            Schema::create('vehicle_status_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('bus_id')->constrained('buses')->cascadeOnDelete();
                $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
                $table->foreignId('trip_id')->nullable()->constrained('trips')->nullOnDelete();
                $table->string('fuel_status',24)->nullable();
                $table->string('engine_status',24)->nullable();
                $table->string('tires_status',24)->nullable();
                $table->string('network_status',24)->nullable();
                $table->unsignedTinyInteger('fuel_percent')->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('reported_at');
                $table->timestamps();
                $table->index(['bus_id','reported_at']);
            });
        }

        if (!Schema::hasTable('packages')) {
            Schema::create('packages', function (Blueprint $table) {
                $table->id();
                $table->uuid('public_id')->unique();
                $table->char('tracking_token_hash',64)->unique();
                $table->foreignId('trip_id')->nullable()->constrained('trips')->nullOnDelete();
                $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
                $table->string('reference',40)->unique();
                $table->string('status',24)->default('received');
                $table->string('sender_name',150)->nullable();
                $table->string('recipient_name',150);
                $table->string('recipient_phone',40)->nullable();
                $table->string('recipient_email')->nullable();
                $table->text('description')->nullable();
                $table->timestamp('delivered_at')->nullable();
                $table->timestamps();
                $table->index(['trip_id','status']);
            });
        }
        if (!Schema::hasTable('package_events')) {
            Schema::create('package_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('package_id')->constrained('packages')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('status',24);
                $table->text('notes')->nullable();
                $table->timestamp('occurred_at');
                $table->timestamps();
                $table->index(['package_id','occurred_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('package_events');
        Schema::dropIfExists('packages');
        Schema::dropIfExists('vehicle_status_reports');
        Schema::dropIfExists('driver_schedules');
        // Seat layout columns are intentionally retained on rollback to avoid losing configured layouts.
    }
};
