<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('booking_passengers') && !Schema::hasColumn('booking_passengers', 'boarded_at')) {
            Schema::table('booking_passengers', function (Blueprint $table) {
                $table->timestamp('boarded_at')->nullable()->after('phone')->index();
            });
        }

        if (!Schema::hasTable('incidents')) {
            Schema::create('incidents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
                $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
                $table->foreignId('reported_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('title', 120);
                $table->text('description');
                $table->string('severity', 16)->default('medium');
                $table->string('status', 24)->default('open');
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->index(['trip_id', 'status']);
                $table->index(['status', 'severity']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');

        if (Schema::hasTable('booking_passengers') && Schema::hasColumn('booking_passengers', 'boarded_at')) {
            Schema::table('booking_passengers', function (Blueprint $table) {
                $table->dropColumn('boarded_at');
            });
        }
    }
};
